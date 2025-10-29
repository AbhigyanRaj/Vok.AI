import express from 'express';
import Module from '../models/Module.js';
import Call from '../models/Call.js';
import { protect } from '../middleware/auth.js';
import { generateLoanQuestions, generateCreditCardQuestions } from '../config/openai.js';
import { preGenerateModuleAudio } from '../services/audioCache.js';

const router = express.Router();

// Get all modules for user
router.get('/', protect, async (req, res) => {
  try {
    const { type, active } = req.query;
    
    let query = { 
      userId: req.user._id,
      isDeleted: false // Exclude soft-deleted modules
    };
    
    // Filter by type if provided
    if (type && ['loan', 'credit_card', 'custom'].includes(type)) {
      query.type = type;
    }
    
    // Filter by active status if provided
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const modules = await Module.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: modules.length,
      modules
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch modules',
      message: error.message 
    });
  }
});

// Get single module by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Get call statistics for this module
    const callStats = await Call.aggregate([
      { $match: { moduleId: module._id } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          completedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    const stats = callStats.length > 0 ? callStats[0] : {
      totalCalls: 0,
      completedCalls: 0,
      avgDuration: 0
    };

    res.json({
      success: true,
      module: {
        ...module.toObject(),
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch module',
      message: error.message 
    });
  }
});

// Create new module
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, type, questions } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Module name is required' });
    }

    if (!type || !['loan', 'credit_card', 'custom'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid module type. Must be loan, credit_card, or custom' 
      });
    }

    let moduleQuestions = [];

    // Generate predefined questions for loan/credit_card types
    if (type === 'loan') {
      const predefinedQuestions = generateLoanQuestions();
      moduleQuestions = predefinedQuestions.map((question, index) => ({
        question,
        order: index,
        required: true
      }));
    } else if (type === 'credit_card') {
      const predefinedQuestions = generateCreditCardQuestions();
      moduleQuestions = predefinedQuestions.map((question, index) => ({
        question,
        order: index,
        required: true
      }));
    } else if (type === 'custom') {
      // For custom modules, use provided questions
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ 
          error: 'Questions are required for custom modules' 
        });
      }
      
      moduleQuestions = questions.map((q, index) => ({
        question: typeof q === 'string' ? q : q.question,
        order: typeof q === 'string' ? index : (q.order || index),
        required: typeof q === 'string' ? true : (q.required !== false)
      }));
    }

    const module = await Module.create({
      userId: req.user._id,
      name: name.trim(),
      description: description ? description.trim() : '',
      type,
      questions: moduleQuestions,
    });

    // Pre-generate audio for Pro/Enterprise users only
    // This prevents API abuse for free users
    const userSubscription = req.user.subscription?.tier || 'free';
    
    if (userSubscription === 'pro' || userSubscription === 'enterprise') {
      console.log(`🎤 Pre-generating audio for ${userSubscription} user's module...`);
      try {
        await preGenerateModuleAudio(module, 'RACHEL');
        console.log('✅ Audio pre-generation complete');
      } catch (error) {
        console.warn('⚠️ Audio pre-generation failed:', error.message);
        console.warn('   Module created successfully, audio will be generated on-demand');
      }
    } else {
      console.log('ℹ️ Free user - audio will be generated on-demand with Twilio TTS');
    }

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      module
    });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ 
      error: 'Failed to create module',
      message: error.message 
    });
  }
});

// Update module
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, questions, isActive } = req.body;
    
    const updateData = {};
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Module name cannot be empty' });
      }
      updateData.name = name.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    
    if (questions !== undefined) {
      if (!Array.isArray(questions)) {
        return res.status(400).json({ error: 'Questions must be an array' });
      }
      
      updateData.questions = questions.map((q, index) => ({
        question: typeof q === 'string' ? q : q.question,
        order: typeof q === 'string' ? index : (q.order || index),
        required: typeof q === 'string' ? true : (q.required !== false)
      }));
    }
    
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const module = await Module.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({
      success: true,
      message: 'Module updated successfully',
      module
    });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ 
      error: 'Failed to update module',
      message: error.message 
    });
  }
});

// Delete module (soft delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const moduleId = req.params.id;
    console.log('Attempting to delete module:', moduleId);
    
    if (!moduleId) {
      return res.status(400).json({ 
        error: 'Module ID is required',
        message: 'No module ID provided'
      });
    }

    // Find the module
    const module = await Module.findOne({
      _id: moduleId,
      userId: req.user._id,
    });

    if (!module) {
      console.log(`Module ${moduleId} not found for user ${req.user._id}`);
      return res.status(404).json({ error: 'Module not found' });
    }

    // Soft delete - mark as deleted instead of removing
    module.isDeleted = true;
    module.deletedAt = new Date();
    module.isActive = false;
    await module.save();

    console.log(`Module ${moduleId} soft deleted successfully`);
    res.json({
      success: true,
      message: 'Module deleted successfully',
      deletedModule: {
        _id: module._id,
        name: module.name
      }
    });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ 
      error: 'Failed to delete module',
      message: error.message 
    });
  }
});

// Toggle module active status
router.patch('/:id/toggle', protect, async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    module.isActive = !module.isActive;
    await module.save();

    res.json({
      success: true,
      message: `Module ${module.isActive ? 'activated' : 'deactivated'} successfully`,
      module
    });
  } catch (error) {
    console.error('Toggle module error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle module status',
      message: error.message 
    });
  }
});

// Get module templates (predefined question sets)
router.get('/templates/list', protect, async (req, res) => {
  try {
    const templates = {
      loan: {
        name: 'Loan Application',
        description: 'Standard questions for loan applications',
        questions: generateLoanQuestions(),
        type: 'loan'
      },
      credit_card: {
        name: 'Credit Card Application',
        description: 'Standard questions for credit card applications',
        questions: generateCreditCardQuestions(),
        type: 'credit_card'
      }
    };

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch templates',
      message: error.message 
    });
  }
});

export default router; 
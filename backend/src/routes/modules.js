import express from 'express';
import Module from '../models/Module.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all modules for user
router.get('/', protect, async (req, res) => {
  try {
    const modules = await Module.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// Create new module
router.post('/', protect, async (req, res) => {
  try {
    const { name, questions } = req.body;
    const module = await Module.create({
      userId: req.user._id,
      name,
      questions,
    });
    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// Update module
router.put('/:id', protect, async (req, res) => {
  try {
    const module = await Module.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// Delete module
router.delete('/:id', protect, async (req, res) => {
  try {
    const module = await Module.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json({ message: 'Module deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

export default router; 
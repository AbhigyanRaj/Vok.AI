import os
import json
import openai
from functools import wraps
from flask_cors import CORS
from datetime import datetime
from urllib.parse import quote
from twilio.rest import Client
from flask import Flask, request, jsonify, Response
from twilio.request_validator import RequestValidator
from twilio.twiml.voice_response import VoiceResponse, Say

def format_phone_number(phone):
    """
    Format phone number to ensure it has the correct prefix
    - Removes any spaces, dashes, or parentheses
    - Adds +91 prefix for Indian numbers if not present
    """
    if not phone:
        return None
        
    # Remove any non-digit characters except '+'
    cleaned = ''.join(char for char in phone if char.isdigit() or char == '+')
    
    # If number starts with '0', remove it
    if cleaned.startswith('0'):
        cleaned = cleaned[1:]
    
    # If number starts with '91', ensure it has '+'
    if cleaned.startswith('91'):
        cleaned = '+' + cleaned
    
    # If number doesn't have any prefix, add '+91'
    if not cleaned.startswith('+'):
        if cleaned.startswith('91'):
            cleaned = '+' + cleaned
        else:
            cleaned = '+91' + cleaned
    
    # Validate the final format
    if not cleaned.startswith('+91') or len(cleaned) != 13:
        return None
            
    return cleaned

# Global base URL - Change this as needed
BASE_URL = "https://1b30-2409-40d0-1332-b482-d886-b19e-bb55-fc51.ngrok-free.app"

app = Flask(__name__)

# Updated CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": [
            "Content-Type",
            "X-Requested-With",
            "X-Twilio-Signature",
            "Authorization"
        ],
        "expose_headers": [
            "Content-Type",
            "X-Twilio-Signature"
        ]
    }
})

# Add security headers middleware
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-Twilio-Signature,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

def validate_twilio_request(f):
    """Validates that incoming requests genuinely originated from Twilio"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the request URL and authentication token
        validator = RequestValidator(os.environ.get('TWILIO_AUTH_TOKEN'))
        
        # Get the original Twilio signature
        twilio_signature = request.headers.get('X-TWILIO-SIGNATURE', '')
        
        # Get the full URL from the request
        url = request.url
        
        # For ngrok URLs, we need to ensure we're using https and the correct host
        if 'ngrok' in url:
            # Get the forwarded host and proto from headers
            forwarded_proto = request.headers.get('X-Forwarded-Proto', 'https')
            forwarded_host = request.headers.get('X-Forwarded-Host', '')
            
            if forwarded_host:
                # Reconstruct the URL using the forwarded information
                url = f"{forwarded_proto}://{forwarded_host}{request.path}"
                if request.query_string:
                    url = f"{url}?{request.query_string.decode('utf-8')}"
        
        # Get POST data, handling both form data and JSON
        if request.method == "POST":
            if request.is_json:
                post_data = request.get_json() or {}
            else:
                post_data = request.form.to_dict()
        else:
            post_data = {}
            
        print(f"\n=== Twilio Request Validation ===")
        print(f"Twilio Signature: {twilio_signature}")
        print(f"Request URL: {url}")
        print(f"Post Data: {post_data}")
        print(f"Headers: {dict(request.headers)}")
        print(f"Path: {request.path}")
        print(f"Method: {request.method}")
        print(f"Client IP: {request.remote_addr}")
        
        # Skip validation in development/testing
        if os.environ.get('FLASK_ENV') == 'testing':
            print("Skipping validation - development mode")
            return f(*args, **kwargs)
        
        # Validate the request
        is_valid = validator.validate(
            url,
            post_data,
            twilio_signature
        )
        
        print(f"Request validation result: {'Valid' if is_valid else 'Invalid'}")
        
        if is_valid:
            return f(*args, **kwargs)
        
        print("WARNING: Invalid Twilio request signature")
        return Response('Invalid twilio request signature', 403)
        
    return decorated_function

# Track active calls
active_calls = {}

class Loanly:
    def __init__(self):
        # Credentials setup
        self.twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        self.twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        self.twilio_phone_number = os.environ.get('TWILIO_PHONE_NUMBER')
        openai.api_key = os.environ.get('OPENAI_API_KEY')

    def generate_loan_questions(self):
        return [
            "What is your current age?",
            "What is your monthly income in Indian Rupees?",
            "Are you a salaried employee, self-employed, or a business owner?",
            "In which city and state do you currently reside?",
            "What is your current occupation and industry?",
            "How much loan amount are you seeking in Indian Rupees?",
            "Do you have a CIBIL credit score?",
            "Are you a first-time loan applicant?",
            "Do you have any existing EMIs or loan commitments?",
            "What is the primary purpose of this loan?"
        ]

    def generate_cc_questions(self):
        return [
            "What is your current age?",
            "What is your annual income in Indian Rupees?",
            "Are you employed in private sector, government, or self-employed?",
            # "In which city do you currently work?",
            # "Do you have any existing credit cards?",
            # "What is your CIBIL credit score?",
            # "Have you ever defaulted on any credit or loan payment?",
            # "What is your typical monthly household expenditure?",
            # "Do you have any existing loan EMIs?",
            # "Are you a first-time credit card applicant?"
        ]

    def evaluate_loan_application(self, application_data):
        prompt = f"""
        Loan Application Evaluation for Indian Market:
        Applicant Profile: {json.dumps(application_data, indent=2)}

        Decisioning Criteria:
        1. Age: >=18 years
        2. Minimum monthly income: ₹25,000
        3. CIBIL Score: Above 600
        4. Loan-to-income ratio: Max 4x annual income

        Based on the above criteria, respond with exactly one of these three options:
        YES (if application meets all criteria)
        NO (if application clearly fails criteria)
        INVESTIGATION_REQUIRED (if more information needed)
        """

        try:
            client = openai.OpenAI()
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a loan decisioning expert. Respond only with YES, NO, or INVESTIGATION_REQUIRED."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error in loan evaluation: {str(e)}")
            return "INVESTIGATION_REQUIRED"

    def evaluate_cc_application(self, application_data):
        prompt = f"""
        Credit Card Application Evaluation for Indian Market:
        Applicant Profile: {json.dumps(application_data, indent=2)}

        Decisioning Criteria:
        1. Age: 18-60 years
        2. Minimum annual income: ₹3,00,000
        3. CIBIL Score: Above 700
        4. No recent payment defaults
        5. Stable employment

        Based on the above criteria, respond with exactly one of these three options:
        YES (if application meets all criteria)
        NO (if application clearly fails criteria)
        INVESTIGATION_REQUIRED (if more information needed)
        """

        try:
            client = openai.OpenAI()
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a credit card decisioning expert. Respond only with YES, NO, or INVESTIGATION_REQUIRED."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error in credit card evaluation: {str(e)}")
            return "INVESTIGATION_REQUIRED"

    def save_application_result(self, name, phone_number, result, application_type):
        result_data = {
            "name": name,
            "phone_number": phone_number,
            "decision": result,
            "application_type": application_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # Create applications directory if it doesn't exist
        if not os.path.exists('applications'):
            os.makedirs('applications')
            
        # Save to JSON file with timestamp and phone number as identifier
        filename = f"applications/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{phone_number}.json"
        with open(filename, 'w') as f:
            json.dump(result_data, f, indent=2)
        
        return filename

financial_system = Loanly()

@app.route('/')
def home():
    """Root endpoint for basic connectivity testing"""
    return jsonify({
        "status": "ok",
        "message": "Server is running"
    })

@app.route('/call', methods=['POST'])
def call():
    # Add debug logging
    print("Received call request")
    print("Environment variables status:")
    print(f"TWILIO_ACCOUNT_SID exists: {bool(os.environ.get('TWILIO_ACCOUNT_SID'))}")
    print(f"TWILIO_AUTH_TOKEN exists: {bool(os.environ.get('TWILIO_AUTH_TOKEN'))}")
    print(f"TWILIO_PHONE_NUMBER exists: {bool(os.environ.get('TWILIO_PHONE_NUMBER'))}")
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    application_type = data.get('type')
    if not application_type or application_type not in ['loan', 'cc']:
        return jsonify({"error": "Invalid or missing application type. Must be 'loan' or 'cc'"}), 400
    
    # Format and validate the phone number
    phone = data.get('phone')
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400
        
    formatted_phone = format_phone_number(phone)
    if not formatted_phone:
        return jsonify({
            "error": "Invalid phone number format",
            "message": "Phone number must be a valid Indian number with 10 digits and proper country code (e.g., +91XXXXXXXXXX)"
        }), 400
        
    data['phone'] = formatted_phone
        
    # Convert cc to credit_card for internal processing
    if application_type == 'cc':
        application_type = 'credit_card'
        
    return initiate_automated_call(application_type)

def initiate_automated_call(application_type):
    # Get credentials
    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    twilio_token = os.environ.get('TWILIO_AUTH_TOKEN')
    twilio_number = os.environ.get('TWILIO_PHONE_NUMBER')
    
    print("\n=== Call Configuration ===")
    print(f"Application Type: {application_type}")
    print(f"Base URL: {BASE_URL}")
    print(f"Twilio Phone: {twilio_number}")
    print(f"Twilio SID exists: {bool(twilio_sid)}")
    print(f"Twilio Token exists: {bool(twilio_token)}")
    
    # Validate ngrok URL
    if 'ngrok' in BASE_URL:
        try:
            import requests
            # Add more detailed debugging
            print(f"Testing connection to ngrok URL...")
            print(f"Making GET request to: {BASE_URL}/health")
            
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            print(f"Response status code: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code != 200:
                print(f"WARNING: Base URL {BASE_URL} returned status code {response.status_code}")
                return jsonify({
                    "error": "Server endpoint not accessible",
                    "details": f"Endpoint returned status {response.status_code}. Please ensure your Flask app is running on port 5001"
                }), 503
        except requests.exceptions.ConnectionError as e:
            print(f"ERROR: Connection failed to {BASE_URL}")
            print(f"Error details: {str(e)}")
            return jsonify({
                "error": "Cannot connect to server",
                "details": "Please ensure both Flask app and ngrok are running correctly"
            }), 503
        except Exception as e:
            print(f"ERROR: Unexpected error connecting to {BASE_URL}: {str(e)}")
            return jsonify({
                "error": "Server endpoint not accessible",
                "details": str(e)
            }), 503

    print(f"Processing {application_type} call request")
    print(f"Using base URL: {BASE_URL}")
    
    if not all([twilio_sid, twilio_token, twilio_number, BASE_URL]):
        missing = {
            "TWILIO_ACCOUNT_SID": twilio_sid is None,
            "TWILIO_AUTH_TOKEN": twilio_token is None,
            "TWILIO_PHONE_NUMBER": twilio_number is None,
            "BASE_URL": BASE_URL is None
        }
        print(f"Missing credentials: {missing}")
        return jsonify({
            "error": "Missing required credentials",
            "missing": missing
        }), 400

    try:
        data = request.get_json()
        print(f"\n=== Request Data ===")
        print(f"Received data: {data}")
        
        customer_number = format_phone_number(data.get('phone'))
        customer_name = data.get('name', 'Customer')
        
        # Check if there's already an active call for this number
        if customer_number in active_calls:
            last_call_time = active_calls[customer_number]['timestamp']
            time_diff = datetime.now() - last_call_time
            
            if time_diff.total_seconds() < 30:
                return jsonify({
                    "error": "Call in progress",
                    "message": "There is already an active call for this number. Please wait for it to complete.",
                    "call_sid": active_calls[customer_number]['call_sid']
                }), 409
            else:
                del active_calls[customer_number]

        print(f"Initiating call to {customer_number} for {customer_name}")
        
        # Construct webhook URL
        callback_url = (
            f"{BASE_URL}/handle-call"
            f"?application_type={quote(application_type)}"
            f"&name={quote(customer_name)}"
            f"&step=0"
            f"&phone_number={quote(customer_number)}"
        )
        
        print(f"\n=== Making Twilio Call ===")
        print(f"To: {customer_number}")
        print(f"From: {twilio_number}")
        print(f"Webhook URL: {callback_url}")
        
        client = Client(twilio_sid, twilio_token)
        call = client.calls.create(
            method='POST',
            url=callback_url,
            to=customer_number,
            from_=twilio_number,
            status_callback=f"{BASE_URL}/call-status",
            status_callback_event=['initiated', 'ringing', 'answered', 'completed'],
            status_callback_method='POST'
        )
        
        print(f"\n=== Call Initiated ===")
        print(f"Call SID: {call.sid}")
        print(f"Status: {call.status}")
        
        # Store call info and return response as before...
        active_calls[customer_number] = {
            'call_sid': call.sid,
            'timestamp': datetime.now(),
            'customer_name': customer_name,
            'application_type': application_type
        }
        
        return jsonify({
            "message": f"Starting {application_type} application call", 
            "call_sid": call.sid,
            "customer": customer_name,
            "phone": customer_number,
            "webhook_url": callback_url
        })
        
    except Exception as e:
        print(f"Error initiating call: {str(e)}")
        return jsonify({
            "error": str(e),
            "type": type(e).__name__
        }), 500

@app.route('/handle-call', methods=['POST', 'GET'])
@validate_twilio_request
def handle_call():
    try:
        # Get parameters from either args or form data
        application_type = request.args.get('application_type') or request.form.get('application_type')
        customer_name = request.args.get('name', 'Customer') or request.form.get('name', 'Customer')
        step = int(request.args.get('step', 0) or request.form.get('step', 0))
        previous_response = request.values.get('SpeechResult', '')
        phone_number = request.args.get('phone_number') or request.form.get('phone_number')
        
        # Convert application_type for display
        display_type = "credit card" if application_type == "credit_card" else application_type
        
        # Set development environment for testing
        os.environ['FLASK_ENV'] = 'development'
        
        print(f"Parameters received:")
        print(f"- Application Type: {application_type}")
        print(f"- Customer Name: {customer_name}")
        print(f"- Step: {step}")
        print(f"- Previous Response: {previous_response}")
        
        # Create a new TwiML response for this request
        twiml_response = VoiceResponse()
        
        # Get appropriate questions based on application type
        questions = (financial_system.generate_loan_questions() if application_type == 'loan' 
                    else financial_system.generate_cc_questions())
        
        # If we're just starting
        if step == 0:
            print("Starting new call flow (step 0)")
            # First just ask if it's a good time to talk
            twiml_response.say(
                f"Hi {customer_name}, is it the right time to speak to you about your {display_type} application?",
                voice='Polly.Aditi'
            )
            
            # Create a new gather for this step
            next_url = f"/handle-call?application_type={quote(application_type)}&name={quote(customer_name)}&step=1&phone_number={quote(phone_number if phone_number else '')}"
            gather = twiml_response.gather(
                input='speech',
                action=next_url,
                timeout=5,
                method='POST'
            )
            
        # If it's step 1 (after they've confirmed it's a good time)
        elif step == 1:
            if previous_response and any(word in previous_response.lower() for word in ['yes', 'okay', 'sure', 'go ahead']):
                twiml_response.say(
                    f"Great! I'll ask you a few questions to evaluate your {display_type} application.",
                    voice='Polly.Aditi'
                )
                twiml_response.pause(length=1)
                
                next_url = f"/handle-call?application_type={quote(application_type)}&name={quote(customer_name)}&step=2&phone_number={quote(phone_number if phone_number else '')}"
                gather = twiml_response.gather(
                    input='speech',
                    action=next_url,
                    timeout=5,
                    method='POST'
                )
                gather.say(questions[0], voice='Polly.Aditi')
            else:
                twiml_response.say(
                    "I understand this isn't a good time. We'll call you back later. Thank you!",
                    voice='Polly.Aditi'
                )
                twiml_response.hangup()
        
        # If we're in the middle of questions (step 2 onwards)
        elif step < len(questions) + 2:
            print(f"Processing step {step} of {len(questions) + 2}")
            
            # Store previous response if available
            if previous_response:
                print(f"Received response for question {step-2}: {previous_response}")
                session_key = f"{phone_number}_{application_type}"
                if session_key not in active_calls:
                    active_calls[session_key] = {'responses': {}, 'customer_name': customer_name}
                active_calls[session_key]['responses'][step-2] = previous_response
            
            question_index = step - 2  # Adjust for the initial confirmation step
            
            # Check if we should play outro (end of questions or call ending)
            should_play_outro = (
                question_index >= len(questions) - 1 or  # Last question completed
                request.values.get('CallStatus') in ['completed', 'failed', 'busy', 'no-answer', 'canceled'] or  # Call ending
                'Hangup' in request.values.get('Digits', '') or  # User hung up
                request.values.get('DialCallStatus') in ['completed', 'failed', 'busy', 'no-answer', 'canceled']  # Call status in different format
            )
            
            if should_play_outro:
                print("Playing outro message...")
                # First, thank them for their responses
                twiml_response.say(
                    "Thank you for providing the information. We are now evaluating your application.",
                    voice='Polly.Aditi'
                )
                twiml_response.pause(length=1)
                twiml_response.say(
                    "Our team will reach out to you within 24 hours with the results. Have a great day!",
                    voice='Polly.Aditi'
                )
                
                # Mark that we're about to deliver the verdict
                session_key = f"{phone_number}_{application_type}"
                if session_key in active_calls:
                    active_calls[session_key]['verdict_delivered'] = True
                    active_calls[session_key]['outro_played'] = True
                
                print("Outro message played, hanging up...")
                # Now hang up after delivering the message
                twiml_response.hangup()
                
            else:
                # Continue with next question
                next_url = f"/handle-call?application_type={quote(application_type)}&name={quote(customer_name)}&step={step+1}&phone_number={quote(phone_number if phone_number else '')}"
                gather = twiml_response.gather(
                    input='speech',
                    action=next_url,
                    timeout=5,
                    method='POST'
                )
                gather.say(questions[question_index], voice='Polly.Aditi')
                print(f"Asked question: {questions[question_index]}")
        
        return Response(str(twiml_response), mimetype='text/xml')
        
    except Exception as e:
        print(f"Critical error in handle-call: {str(e)}")
        error_response = VoiceResponse()
        error_response.say(
            "I apologize, but there was an error. We will call you back later.",
            voice='Polly.Aditi'
        )
        error_response.hangup()
        return Response(str(error_response), mimetype='text/xml')

@app.route('/process-application', methods=['POST'])
def process_application():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    name = data.get('name')
    phone_number = data.get('phone_number')
    
    # Format and validate phone number
    if phone_number:
        phone_number = format_phone_number(phone_number)
        if not phone_number:
            return jsonify({
                "error": "Invalid phone number format",
                "message": "Phone number must be a valid Indian number with 10 digits and proper country code (e.g., +91XXXXXXXXXX)"
            }), 400
            
    application_type = data.get('application_type')
    application_data = data.get('application_data')
    
    if not all([name, phone_number, application_type, application_data]):
        return jsonify({"error": "Missing required parameters"}), 400
    
    if application_type not in ['loan', 'credit_card']:
        return jsonify({"error": "Invalid application type"}), 400
    
    try:
        if application_type == 'loan':
            result = financial_system.evaluate_loan_application(application_data)
        else:
            result = financial_system.evaluate_cc_application(application_data)
        
        # Save application result
        saved_file = financial_system.save_application_result(
            name,
            phone_number, 
            result, 
            application_type
        )
        
        return jsonify({
            "result": result,
            "saved_to": saved_file,
            "timestamp": datetime.now().isoformat()
        }) 
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/debug-env', methods=['GET'])
def debug_env():
    return jsonify({
        'twilio_sid_exists': bool(os.environ.get('TWILIO_ACCOUNT_SID')),
        'twilio_token_exists': bool(os.environ.get('TWILIO_AUTH_TOKEN')),
        'twilio_number_exists': bool(os.environ.get('TWILIO_PHONE_NUMBER')),
        'base_url_exists': bool(os.environ.get('BASE_URL')),
        'openai_key_exists': bool(os.environ.get('OPENAI_API_KEY')),
        'base_url': os.environ.get('BASE_URL', 'not set')
    })

def process_incomplete_application(phone_number, call_data):
    """Process application when call ends prematurely"""
    try:
        # Find the session key
        session_keys = [k for k in active_calls.keys() if k.startswith(phone_number) or k == phone_number]
        
        for session_key in session_keys:
            session_data = active_calls.get(session_key, {})
            
            # Skip processing if we've already delivered the verdict
            if session_data.get('verdict_delivered'):
                print(f"Verdict already delivered for {phone_number}")
                continue
                
            if isinstance(session_data, dict) and 'responses' in session_data:
                # Get application details
                application_type = session_key.split('_')[1] if '_' in session_key else 'unknown'
                customer_name = session_data.get('customer_name', 'Unknown')
                
                print(f"Processing responses for {phone_number}")
                
                # Create responses directory if it doesn't exist
                if not os.path.exists('responses'):
                    os.makedirs('responses')
                
                # Get verdict from OpenAI
                try:
                    if application_type == 'credit_card':
                        verdict = financial_system.evaluate_cc_application(session_data['responses'])
                    else:
                        verdict = financial_system.evaluate_loan_application(session_data['responses'])
                except Exception as e:
                    print(f"Error getting verdict: {str(e)}")
                    verdict = "INVESTIGATION_REQUIRED"
                
                # Generate comments based on the verdict
                comments = []
                if verdict == "YES":
                    comments.append("Application meets all eligibility criteria")
                elif verdict == "NO":
                    comments.append("Application does not meet minimum eligibility requirements")
                else:
                    comments.append("Further verification and documentation required")
                    
                # Add call-specific comments
                if call_data.get('CallDuration'):
                    duration = int(call_data.get('CallDuration', 0))
                    if duration < 30:
                        comments.append("Call duration was too short - incomplete information")
                    elif duration < 60:
                        comments.append("Partial information collected")
                
                # Prepare clean response data
                response_data = {
                    "customer_name": customer_name,
                    "phone_number": phone_number,
                    "application_type": "Credit Card" if application_type == 'credit_card' else "Loan",
                    "verdict": verdict,
                    "comments": comments,
                    "timestamp": datetime.now().isoformat(),
                    "call_duration": call_data.get('CallDuration'),
                    "call_status": call_data.get('CallStatus')
                }
                
                # Save to JSON file with timestamp and phone number
                filename = f"responses/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{phone_number}.json"
                with open(filename, 'w') as f:
                    json.dump(response_data, f, indent=2)
                
                print(f"Saved responses to {filename} with verdict: {verdict}")
                
                # Mark that we're processing this application
                active_calls[session_key]['processing'] = True
                
                # Clean up the session after processing
                if session_key in active_calls:
                    del active_calls[session_key]
            
    except Exception as e:
        print(f"Error processing incomplete application: {str(e)}")
        print(f"Session data: {session_data if 'session_data' in locals() else 'Not available'}")

@app.route('/call-status', methods=['POST', 'OPTIONS'])
@validate_twilio_request
def call_status():
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = Response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-Twilio-Signature,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response

    print("\n=== Call Status Update ===")
    print(f"Status: {request.values.get('CallStatus')}")
    print(f"Call SID: {request.values.get('CallSid')}")
    print(f"All values: {dict(request.values)}")
    print(f"Client IP: {request.remote_addr}")
    
    # Process application if call ended
    if request.values.get('CallStatus') in ['completed', 'failed', 'busy', 'no-answer', 'canceled']:
        phone_number = request.values.get('To')
        if phone_number:
            # Create a TwiML response for the outro
            twiml_response = VoiceResponse()
            twiml_response.say(
                "Thank you for providing the information. We are now evaluating your application.",
                voice='Polly.Aditi'
            )
            twiml_response.pause(length=1)
            twiml_response.say(
                "Our team will reach out to you within 24 hours with the results. Have a great day!",
                voice='Polly.Aditi'
            )
            twiml_response.hangup()
            
            # Process the application
            process_incomplete_application(phone_number, dict(request.values))
            
            # Return the TwiML response
            return Response(str(twiml_response), mimetype='text/xml')
    
    return '', 200

@app.route('/health')
def health_check():
    try:
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "base_url": os.environ.get('BASE_URL'),
            "ngrok_url": request.headers.get('X-Forwarded-Proto', 'http') + '://' + request.headers.get('Host', 'unknown'),
            "flask_running": True
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
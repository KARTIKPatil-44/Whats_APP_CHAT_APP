#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time
import uuid

class SecureChatAPITester:
    def __init__(self, base_url="https://encrypted-messaging-7.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.second_user_token = None
        self.second_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        # Set default headers
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        
        # Add auth token if available
        if self.token and 'Authorization' not in request_headers:
            request_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)

            success = response.status_code == expected_status
            
            result = {
                'test_name': name,
                'method': method,
                'endpoint': endpoint,
                'expected_status': expected_status,
                'actual_status': response.status_code,
                'success': success,
                'timestamp': datetime.now().isoformat()
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    result['response_data'] = response_data
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.text else {}
                    print(f"   Error: {error_data}")
                    result['error_data'] = error_data
                except:
                    print(f"   Error: {response.text}")
                    result['error_text'] = response.text

            self.test_results.append(result)
            return success, {}

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            result = {
                'test_name': name,
                'method': method,
                'endpoint': endpoint,
                'success': False,
                'exception': str(e),
                'timestamp': datetime.now().isoformat()
            }
            self.test_results.append(result)
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_register_user(self, username, email, password, public_key="mock_public_key"):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "username": username,
                "email": email,
                "password": password,
                "public_key": public_key
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User ID: {self.user_id}")
        
        return success, response

    def test_duplicate_registration(self, username, email, password):
        """Test duplicate user registration should fail"""
        success, response = self.run_test(
            "Duplicate Registration (should fail)",
            "POST", 
            "auth/register",
            400,
            data={
                "username": username,
                "email": email,
                "password": password,
                "public_key": "mock_public_key"
            }
        )
        return success

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": email,
                "password": password
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User ID: {self.user_id}")
        
        return success, response

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login (should fail)",
            "POST",
            "auth/login",
            401,
            data={
                "email": "invalid@test.com",
                "password": "wrongpassword"
            }
        )
        return success

    def test_search_users(self, query="test"):
        """Test user search functionality"""
        success, response = self.run_test(
            "Search Users",
            "GET",
            f"users/search?q={query}",
            200
        )
        return success, response

    def test_get_user(self, user_id):
        """Test get user by ID"""
        success, response = self.run_test(
            "Get User by ID",
            "GET",
            f"users/{user_id}",
            200
        )
        return success, response

    def test_send_message(self, receiver_id, encrypted_content="encrypted_test_message", iv="mock_iv"):
        """Test sending encrypted message"""
        success, response = self.run_test(
            "Send Message",
            "POST",
            "messages",
            200,
            data={
                "receiver_id": receiver_id,
                "encrypted_content": encrypted_content,
                "iv": iv,
                "sender_public_key": "mock_sender_public_key"
            }
        )
        return success, response

    def test_get_messages(self, other_user_id):
        """Test getting messages between users"""
        success, response = self.run_test(
            "Get Messages",
            "GET",
            f"messages/{other_user_id}",
            200
        )
        return success, response

    def test_add_contact(self, contact_id):
        """Test adding a contact"""
        success, response = self.run_test(
            "Add Contact",
            "POST",
            "contacts",
            200,
            data={
                "contact_id": contact_id
            }
        )
        return success, response

    def test_get_contacts(self):
        """Test getting user contacts"""
        success, response = self.run_test(
            "Get Contacts",
            "GET",
            "contacts",
            200
        )
        return success, response

    def test_create_audit_log(self, event_type="test_event"):
        """Test creating audit log"""
        success, response = self.run_test(
            "Create Audit Log",
            "POST",
            "audit-logs",
            200,
            data={
                "event_type": event_type,
                "chat_id": str(uuid.uuid4()),
                "device_info": json.dumps({
                    "method": "test",
                    "platform": "test_platform",
                    "userAgent": "test_agent"
                })
            }
        )
        return success, response

    def test_get_audit_logs(self):
        """Test getting audit logs"""
        success, response = self.run_test(
            "Get Audit Logs",
            "GET",
            "audit-logs",
            200
        )
        return success, response

    def test_unauthorized_access(self):
        """Test unauthorized access should fail"""
        # Save current token
        current_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access (should fail)",
            "GET",
            "contacts",
            401
        )
        
        # Restore token
        self.token = current_token
        return success

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"🔍 SECURE CHAT API TEST SUMMARY")
        print(f"{'='*60}")
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"💯 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print(f"\n❌ FAILED TESTS:")
            failed_tests = [t for t in self.test_results if not t['success']]
            for test in failed_tests:
                print(f"   • {test['test_name']}: Expected {test.get('expected_status', 'N/A')}, got {test.get('actual_status', 'N/A')}")
        
        return self.tests_passed == self.tests_run

def main():
    print("🚀 Starting Secure Chat API Tests...")
    print("=" * 60)
    
    # Setup
    tester = SecureChatAPITester()
    timestamp = datetime.now().strftime('%H%M%S')
    test_email1 = f"testuser1_{timestamp}@test.com"
    test_email2 = f"testuser2_{timestamp}@test.com"
    test_username1 = f"testuser1_{timestamp}"
    test_username2 = f"testuser2_{timestamp}"
    test_password = "TestPass123!"

    # Test 1: API Root
    if not tester.test_api_root():
        print("❌ API root failed, aborting tests")
        return 1

    # Test 2: User Registration
    success, user1_data = tester.test_register_user(test_username1, test_email1, test_password)
    if not success:
        print("❌ User registration failed, aborting tests")
        return 1

    # Test 3: Duplicate registration should fail
    tester.test_duplicate_registration(test_username1, test_email1, test_password)

    # Test 4: Login
    success, login_data = tester.test_login(test_email1, test_password)
    if not success:
        print("❌ Login failed, aborting tests")
        return 1

    # Test 5: Invalid login should fail
    tester.test_invalid_login()

    # Test 6: Register second user for messaging tests
    tester_temp_token = tester.token  # Save first user token
    success, user2_data = tester.test_register_user(test_username2, test_email2, test_password)
    if success:
        second_user_id = tester.user_id
        tester.token = tester_temp_token  # Restore first user token
        tester.user_id = user1_data['user']['id'] if user1_data else None
    else:
        print("❌ Second user registration failed, continuing with limited tests")
        second_user_id = None

    # Test 7: Search users
    tester.test_search_users("test")

    # Test 8: Get user (test with second user if available)
    if second_user_id:
        tester.test_get_user(second_user_id)

    # Test 9: Add contact
    if second_user_id:
        tester.test_add_contact(second_user_id)

    # Test 10: Get contacts
    tester.test_get_contacts()

    # Test 11: Send message
    if second_user_id:
        tester.test_send_message(second_user_id)

    # Test 12: Get messages
    if second_user_id:
        tester.test_get_messages(second_user_id)

    # Test 13: Create audit log
    tester.test_create_audit_log("screenshot_attempt")

    # Test 14: Get audit logs
    tester.test_get_audit_logs()

    # Test 15: Unauthorized access should fail
    tester.test_unauthorized_access()

    # Print summary and return appropriate exit code
    success = tester.print_summary()
    
    # Save test results to file
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run)*100,
                'timestamp': datetime.now().isoformat()
            },
            'test_results': tester.test_results
        }, f, indent=2)

    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
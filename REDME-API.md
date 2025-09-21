# School Management System - Authentication API

## Day 2: Authentication Endpoints

### Base URL
http://localhost:5000/api

text

### Authentication Endpoints

#### 1. Register User
POST /auth/register

**Request Body:**
{
"name": "John Doe",
"email": "john@example.com",
"password": "password123",
"role": "teacher",
"phone": "1234567890",
"address": {
"street": "123 Main St",
"city": "Anytown",
"state": "State",
"zipCode": "12345"
}
}

**Response:**
{
"success": true,
"message": "User registered successfully",
"data": {
"user": {
"id": "user_id",
"name": "John Doe",
"email": "john@example.com",
"role": "teacher",
"employeeId": "EMP123456789"
},
"auth": {
"token": "jwt_token",
"refreshToken": "refresh_token",
"expiresIn": "7d"
}
}
}

text

#### 2. Login User
POST /auth/login

text

**Request Body:**
{
"email": "john@example.com",
"password": "password123"
}

text

#### 3. Get Current User Profile
GET /auth/me
Authorization: Bearer {token}

text

#### 4. Change Password
PATCH /auth/change-password
Authorization: Bearer {token}


**Request Body:**
{
"currentPassword": "oldpassword",
"newPassword": "newpassword"
}



#### 5. Logout
POST /auth/logout
Authorization: Bearer {token}



### User Management Endpoints

#### 1. Get All Users (Admin/Principal only)
GET /users?page=1&limit=10&role=teacher&search=john
Authorization: Bearer {token}



#### 2. Get User by ID
GET /users/:id
Authorization: Bearer {token}



#### 3. Update User Profile
PATCH /users/:id
Authorization: Bearer {token}



#### 4. Delete User (Admin only)
DELETE /users/:id
Authorization: Bearer {token}



#### 5. Get Users by Role
GET /users/role/teacher
Authorization: Bearer {token}



### Error Responses
{
"success": false,
"message": "Error message",
"error": "Detailed error information"
}











# Judge0 API Setup Guide

## Overview
Judge0 is a robust, scalable, and open-source online code execution system. We use their API service for secure code execution in our Learning Management System.

## Setup Options

### Option 1: RapidAPI (Recommended for Development)

1. **Sign up for RapidAPI**
   - Go to: https://rapidapi.com/judge0-official/api/judge0-ce
   - Create a free account
   - Subscribe to the free plan (100 requests/day)

2. **Get API Credentials**
   - After subscribing, go to the API dashboard
   - Copy your API Key from the request headers
   - Note the API Host: `judge0-ce.p.rapidapi.com`

3. **Configure Environment**
   Add to your `.env` file:
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com

4. **Test Connection**
Start your server
npm run dev

Test Judge0 connection
curl -X GET "http://localhost:5000/api/judge0/test"
-H "Authorization: Bearer your_admin_token"

### Option 2: Self-hosted Judge0 (For Production)

1. **Prerequisites**
- Docker and Docker Compose
- At least 2GB RAM
- Linux/macOS (recommended)

2. **Installation**
Clone Judge0 repository
git clone https://github.com/judge0/judge0.git
cd judge0

Start services
docker-compose up -d db redis
sleep 10s
docker-compose up -d


3. **Configuration**
Update your `.env` file:
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=
JUDGE0_API_HOST=

text

## Supported Languages

Our system supports these programming languages through Judge0:

| Language   | Judge0 ID | Version          |
|------------|-----------|------------------|
| JavaScript | 63        | Node.js 14.15.4  |
| Python     | 71        | Python 3.8.1     |
| Java       | 62        | OpenJDK 13.0.1   |
| C++        | 54        | GCC 9.2.0        |
| C          | 50        | GCC 9.2.0        |

## API Limits

### Free Plan (RapidAPI)
- 100 requests/day
- 5 seconds execution time limit
- 128MB memory limit
- Perfect for development and testing

### Paid Plans
- Up to 50,000+ requests/month
- Higher execution limits
- Priority support

## Testing Your Setup

1. **Test API Connection**
npm run test:judge0

text

2. **Run Full Code Execution Test**
node utils/testCodeExecution.js

text

3. **Manual API Test**
curl -X POST "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true"
-H "content-type: application/json"
-H "X-RapidAPI-Key: YOUR_API_KEY"
-H "X-RapidAPI-Host: judge0-ce.p.rapidapi.com"
-d '{
"language_id": 63,
"source_code": "Y29uc29sZS5sb2coIkhlbGxvIFdvcmxkIik=",
"stdin": ""
}'

text

## Troubleshooting

### Common Issues

1. **API Key Invalid**
- Verify your RapidAPI subscription
- Check if API key is correctly copied
- Ensure no extra spaces in .env file

2. **Rate Limit Exceeded**
- Free plan: 100 requests/day
- Upgrade plan or wait 24 hours
- Consider self-hosted solution

3. **Connection Timeout**
- Check your internet connection
- Verify API endpoint URL
- Try different RapidAPI endpoint

4. **Compilation Errors**
- Check language ID mapping
- Verify code syntax
- Review Judge0 documentation

### Debug Mode

Enable debug logging in your service:

// services/judge0Service.js
console.log('Judge0 Request:', {
url: ${this.baseURL}/submissions,
headers: {
'X-RapidAPI-Key': this.apiKey?.substring(0, 10) + '...',
'X-RapidAPI-Host': this.apiHost
}
});

text

## Security Considerations

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Code Execution Safety**
   - Judge0 runs code in isolated containers
   - Network access is disabled
   - Memory and time limits enforced

3. **Input Validation**
   - Validate code length (max 50KB)
   - Sanitize user input
   - Implement rate limiting

## Production Deployment

For production environments:

1. **Self-hosted Judge0**
   - Better performance and control
   - No external API dependencies
   - Custom resource limits

2. **Load Balancing**
   - Multiple Judge0 instances
   - Request distribution
   - Failover mechanisms

3. **Monitoring**
   - Execution time metrics
   - Error rate tracking
   - Resource usage monitoring

## Support

- **Judge0 Documentation**: https://ce.judge0.com/
- **RapidAPI Support**: https://rapidapi.com/support
- **GitHub Issues**: https://github.com/judge0/judge0/issues








Assignment Management System? 📝
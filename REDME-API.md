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
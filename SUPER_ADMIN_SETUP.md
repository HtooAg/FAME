# Super Admin Account Setup

This guide explains how to create a super admin account for the FAME Event Management System.

## Prerequisites

-   The application must be running
-   Google Cloud Storage must be configured
-   Environment variables must be set up correctly

## Method 1: Using the Web Interface (Recommended)

1. **Navigate to the setup page:**

    ```
    http://localhost:3000/setup-admin
    ```

2. **Fill in the form:**

    - Full Name: Your name
    - Email: A valid email address
    - Password: At least 8 characters long
    - Confirm Password: Must match the password

3. **Click "Create Super Admin Account"**

4. **Login:**
    - Go to `/login`
    - Use your email and password
    - You'll be redirected to `/super-admin`

## Method 2: Using the Command Line Script (TypeScript)

1. **Run the TypeScript script:**

    ```bash
    npx ts-node scripts/create-super-admin.ts "Admin Name" admin@example.com mypassword123
    ```

2. **Example:**
    ```bash
    npx ts-node scripts/create-super-admin.ts "John Doe" john@company.com SecurePass123
    ```

## Method 3: Using the Command Line Script (JavaScript)

1. **Run the JavaScript script:**

    ```bash
    node scripts/create-super-admin.js "Admin Name" admin@example.com mypassword123
    ```

2. **Example:**
    ```bash
    node scripts/create-super-admin.js "Jane Smith" jane@company.com MyPassword456
    ```

## Method 4: Using the API Endpoint

1. **Make a POST request to:**

    ```
    POST /api/admin/create-super-admin
    ```

2. **Request body:**

    ```json
    {
    	"name": "Admin Name",
    	"email": "admin@example.com",
    	"password": "mypassword123"
    }
    ```

3. **Example using curl:**
    ```bash
    curl -X POST http://localhost:3000/api/admin/create-super-admin \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Super Admin",
        "email": "admin@example.com",
        "password": "securepassword123"
      }'
    ```

## Security Notes

### Password Requirements

-   Minimum 8 characters long
-   Use a strong, unique password
-   Consider using a password manager

### Production Security

-   The API endpoint is automatically disabled in production if a super admin already exists
-   The web interface should be removed or protected in production
-   Consider using environment variables for initial admin credentials

### Email Validation

-   Must be a valid email format
-   Email addresses must be unique across all users

## What Happens After Creation

1. **User Record Created:**

    - Stored in `users/users.json`
    - Individual file at `users/super_admin/{id}.json`

2. **Account Details:**

    - Role: `super_admin`
    - Status: `active`
    - Password: Hashed with bcrypt

3. **Access:**
    - Login at `/login`
    - Redirected to `/super-admin` dashboard
    - Full access to manage stage managers and system

## Troubleshooting

### "User already exists" Error

-   Check if the email is already registered
-   Use a different email address

### "Invalid email format" Error

-   Ensure the email follows the format: user@domain.com

### "Password too short" Error

-   Use a password with at least 8 characters

### GCS Connection Issues

-   Verify your Google Cloud Storage credentials
-   Check the bucket name and project ID
-   Ensure the service account has proper permissions

### Script Execution Issues

-   Make sure you have the required dependencies installed:
    ```bash
    npm install
    ```
-   For TypeScript script, ensure ts-node is available:
    ```bash
    npm install -g ts-node
    ```

## Verification

After creating the super admin account, you can verify it was created successfully:

1. **Login Test:**

    - Go to `/login`
    - Enter your credentials
    - Should redirect to `/super-admin`

2. **Check User Data:**
    - The user should appear in your GCS bucket at `users/users.json`
    - Individual file should exist at `users/super_admin/{id}.json`

## Next Steps

Once your super admin account is created:

1. **Login to the system**
2. **Access the super admin dashboard at `/super-admin`**
3. **Start managing stage manager registrations**
4. **Configure system settings as needed**

## Support

If you encounter issues creating the super admin account:

1. Check the application logs for error details
2. Verify your Google Cloud Storage configuration
3. Ensure all environment variables are set correctly
4. Check network connectivity to GCS

For additional help, refer to the main application documentation or contact your system administrator.

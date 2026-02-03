# Digital Mart POS API

A secure, multi-tenant Point of Sale (POS) backend API built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Multi-Tenant Architecture**: Each tenant has isolated data with per-database isolation
- **Role-Based Access Control (RBAC)**: Three roles - `super_admin`, `shop_admin`, and `staff`
- **Dark API Mode**: No public documentation; only authenticated requests are served
- **JWT Authentication**: Secure token-based auth with refresh token rotation
- **Audit Logging**: Complete audit trail of all user actions
- **Docker Ready**: Containerized deployment with Docker Compose
- **Production Security**: Helmet, CORS, rate limiting, and input validation

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Development](#development)

## 🛠 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 7.0+
- Redis (optional, for rate limiting)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd digitalmartpos
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Access the API**
   - API URL: `http://localhost:3000`
   - Health check: `http://localhost:3000/health`

## 📁 Project Structure

```
digitalmartpos/
├── src/
│   ├── app.js              # Main application entry point
│   ├── config/             # Configuration files
│   │   ├── index.js       # Main config
│   │   └── database.js    # Database connection
│   ├── middleware/         # Express middleware
│   │   ├── auth.js        # JWT authentication
│   │   ├── rbac.js        # Role-based access control
│   │   ├── errorHandler.js# Error handling
│   │   ├── rateLimiter.js # Rate limiting
│   │   └── index.js       # Middleware exports
│   ├── models/             # MongoDB models
│   │   ├── Tenant.js      # Tenant model
│   │   ├── User.js        # User model
│   │   ├── Product.js     # Product model
│   │   ├── Sale.js        # Sale model
│   │   ├── Staff.js       # Staff model
│   │   ├── AuditLog.js    # Audit log model
│   │   └── index.js       # Model exports
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication routes
│   │   ├── products.js    # Product routes
│   │   ├── sales.js       # Sales routes
│   │   ├── staff.js       # Staff routes
│   │   └── index.js       # Route exports
│   ├── services/          # Business logic
│   │   ├── authService.js
│   │   ├── productService.js
│   │   ├── saleService.js
│   │   ├── staffService.js
│   │   └── index.js       # Service exports
│   └── utils/             # Utility functions
│       ├── jwt.js         # JWT utilities
│       └── helpers.js     # Helper functions
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker image definition
├── package.json           # Project dependencies
└── .env.example           # Environment variables template
```

## ⚙️ Configuration

### Environment Variables

| Variable                  | Description               | Default                                  |
| ------------------------- | ------------------------- | ---------------------------------------- |
| `NODE_ENV`                | Environment mode          | `development`                            |
| `PORT`                    | Server port               | `3000`                                   |
| `MONGO_URI`               | MongoDB connection string | `mongodb://localhost:27017/digital_mart` |
| `JWT_SECRET`              | JWT access token secret   | Required                                 |
| `JWT_REFRESH_SECRET`      | JWT refresh token secret  | Required                                 |
| `JWT_ACCESS_EXPIRY`       | Access token expiry       | `15m`                                    |
| `JWT_REFRESH_EXPIRY`      | Refresh token expiry      | `7d`                                     |
| `REDIS_URL`               | Redis connection string   | `redis://localhost:6379`                 |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window         | `900000`                                 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window   | `100`                                    |
| `CORS_ORIGIN`             | Allowed CORS origin       | `*`                                      |
| `API_URL`                 | API base URL              | `http://localhost:3000`                  |

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint            | Description                | Access      |
| ------ | ------------------- | -------------------------- | ----------- |
| POST   | `/api/auth/login`   | User login                 | Public      |
| POST   | `/api/auth/logout`  | User logout                | Private     |
| POST   | `/api/auth/refresh` | Refresh tokens             | Public      |
| POST   | `/api/auth/setup`   | Initial super admin setup  | Public\*    |
| POST   | `/api/auth/tenants` | Create tenant + shop admin | Super Admin |

### Products (`/api/products`)

| Method | Endpoint                   | Description    | Access     |
| ------ | -------------------------- | -------------- | ---------- |
| GET    | `/api/products`            | List products  | Private    |
| GET    | `/api/products/:id`        | Get product    | Private    |
| POST   | `/api/products`            | Create product | Shop Admin |
| PUT    | `/api/products/:id`        | Update product | Shop Admin |
| DELETE | `/api/products/:id`        | Delete product | Shop Admin |
| POST   | `/api/products/:id/stock`  | Update stock   | Shop Admin |
| GET    | `/api/products/categories` | Get categories | Private    |
| GET    | `/api/products/low-stock`  | Get low stock  | Private    |

### Sales (`/api/sales`)

| Method | Endpoint                | Description     | Access             |
| ------ | ----------------------- | --------------- | ------------------ |
| GET    | `/api/sales`            | List sales      | Private            |
| GET    | `/api/sales/:id`        | Get sale        | Private            |
| POST   | `/api/sales`            | Create sale     | Private            |
| POST   | `/api/sales/:id/cancel` | Cancel sale     | Shop Admin         |
| POST   | `/api/sales/:id/refund` | Refund sale     | Shop Admin/Manager |
| GET    | `/api/sales/summary`    | Sales analytics | Shop Admin         |

### Staff (`/api/staff`)

| Method | Endpoint                  | Description    | Access     |
| ------ | ------------------------- | -------------- | ---------- |
| GET    | `/api/staff`              | List staff     | Shop Admin |
| GET    | `/api/staff/:id`          | Get staff      | Shop Admin |
| POST   | `/api/staff`              | Create staff   | Shop Admin |
| PUT    | `/api/staff/:id`          | Update staff   | Shop Admin |
| POST   | `/api/staff/:id/suspend`  | Suspend staff  | Shop Admin |
| POST   | `/api/staff/:id/activate` | Activate staff | Shop Admin |
| DELETE | `/api/staff/:id`          | Delete staff   | Shop Admin |

## 🚢 Deployment

### Docker Deployment

1. **Configure environment**

   ```bash
   cp .env.example .env
   # Set production values
   ```

2. **Build and start containers**

   ```bash
   docker-compose up -d --build
   ```

3. **Check logs**

   ```bash
   docker-compose logs -f api
   ```

4. **Stop containers**
   ```bash
   docker-compose down
   ```

### Production VPS Deployment

1. **Transfer files to VPS**

   ```bash
   scp -r . user@your-vps:/path/to/digitalmartpos
   ```

2. **On VPS, configure environment**

   ```bash
   cp .env.example .env
   # Edit with production values
   ```

3. **Deploy with Docker**

   ```bash
   docker-compose up -d --build
   ```

4. **Configure reverse proxy (nginx)**
   - Point `api.digitalmartmm.shop` to port 3000
   - Set up SSL/TLS certificates

### Nginx Configuration Example

```nginx
server {
    server_name api.digitalmartmm.shop;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL configuration
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.digitalmartmm.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.digitalmartmm.shop/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
}

server {
    server_name api.digitalmartmm.shop;
    if ($host = api.digitalmartmm.shop) {
        return 301 https://$host$request_uri;
    }
}
```

## 🔐 Initial Setup

1. **Start the server**

   ```bash
   npm start
   ```

2. **Create super admin**

   ```bash
   curl -X POST http://localhost:3000/api/auth/setup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "SecurePassword123!",
       "firstName": "Admin",
       "lastName": "User"
     }'
   ```

3. **Login as super admin**

   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "SecurePassword123!"
     }'
   ```

4. **Create a tenant with shop admin** (using the access token)
   ```bash
   curl -X POST http://localhost:3000/api/auth/tenants \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -d '{
       "tenantName": "My Shop",
       "shopAdminEmail": "shop@example.com",
       "shopAdminPassword": "ShopPassword123!",
       "shopAdminName": "Shop Owner",
       "plan": "professional"
     }'
   ```

## 📊 Multi-Tenant Data Isolation

The system uses a **database-per-tenant** strategy:

- Global database: `tenants`, `users` collections
- Tenant databases: `tenant_{tenantId}` (collection prefix)

```
Global DB:            Tenant DBs:
├── tenants           ├── tenant_acme_abc123
├── users               ├── products
                        ├── sales
                        ├── staff
                        └── audit_logs
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 License

MIT License

## 🤝 Support

For issues and feature requests, please create an issue in the repository.

# NestJS Queue API - Technical Assessment

A flexible NestJS API that supports publishing and subscribing to messages using pluggable queue implementations (AWS SQS and RabbitMQ). The queue provider can be switched via environment variables without any code changes.

## 🎨 Web Dashboard

The application includes a beautiful, modern web dashboard for managing your message queues:

**Access the dashboard**: Open `http://localhost:3000` in your browser after starting the application.

### Dashboard Features

- **📊 Real-time Statistics**: View message counts, queue size, and API response times
- **📤 Publish Messages**: Send messages with custom content and metadata via an intuitive form
- **📥 Receive Messages**: Fetch and display messages from the queue with configurable limits
- **🎯 Provider Detection**: Automatically identifies and labels message IDs by provider:
  - **SQS messages** display with green `(SQS)` or `(SQS Receipt)` labels
  - **RabbitMQ messages** display with orange `(RabbitMQ)` labels
  - **Composite mode** shows messages from both queues with clear provider identification
- **⚡ Live Status**: Real-time API connectivity and queue provider status badges

### Dashboard Screenshots

When using **SQS** (`QUEUE_PROVIDER=sqs`):
- Message IDs appear as UUIDs (e.g., `bc6b80c3-defc-48ca-b81f-e135b93e81a3`) labeled with `(SQS)`
- Received messages show Base64 receipt handles labeled with `(SQS Receipt)`

When using **RabbitMQ** (`QUEUE_PROVIDER=rabbitmq`):
- Message IDs appear as timestamps (e.g., `1763642060497-qom6s7yfy`) labeled with `(RabbitMQ)`

When using **Both** (`QUEUE_PROVIDER=both`):
- Published messages show comma-separated IDs from both providers with individual labels
- Received messages display separately, each clearly labeled with their provider
- Example: You'll see both SQS receipt handles and RabbitMQ timestamp IDs in the same result set

## 🏗️ Architecture Overview

### Key Design Decisions

1. **Dynamic Module Pattern**: Uses NestJS Dynamic Modules to load different queue providers based on configuration
2. **Interface-Based Abstraction**: All queue providers implement a common `IQueueService` interface
3. **Composite Pattern**: Supports using both queues simultaneously for testing and migration scenarios
4. **Zero Code Changes**: Switch between SQS, RabbitMQ, or both by changing the `QUEUE_PROVIDER` environment variable

### Project Structure

```
src/
├── queue/
│   ├── interfaces/
│   │   └── queue.interface.ts        # Common queue interface
│   ├── providers/
│   │   ├── sqs-queue.service.ts      # AWS SQS implementation
│   │   ├── rabbitmq-queue.service.ts # RabbitMQ implementation
│   │   └── composite-queue.service.ts # Both queues together
│   ├── constants/
│   │   └── queue.constants.ts        # Injection tokens
│   ├── dto/
│   │   └── queue.dto.ts              # Data transfer objects
│   ├── queue.module.ts               # Dynamic module configuration
│   ├── queue.controller.ts           # REST API endpoints
│   └── queue-consumer.service.ts     # Message consumer logic
├── app.module.ts                     # Root application module
└── main.ts                           # Application 
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PowerShell (Windows) or Bash (Linux/Mac)

### Installation

1. **Install dependencies**:
   ```powershell
   npm install
   ```

2. **Configure environment variables**:
   ```powershell   
   # Edit .env to configure your queue provider
   # Options: 'sqs', 'rabbitmq', 'both'
   QUEUE_PROVIDER=both
   ```

### Running with Docker Compose (Recommended)

This starts LocalStack (SQS), RabbitMQ, and optionally the NestJS app:

```powershell
# Start all services (LocalStack + RabbitMQ + App)
docker-compose up -d

# Or start only the queue services (run app locally)
docker-compose up -d localstack rabbitmq

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Running Locally

**Option 1: With RabbitMQ**

```powershell
# Start RabbitMQ and LocalStack
docker-compose up -d rabbitmq localstack

# Set environment for RabbitMQ
$env:QUEUE_PROVIDER="rabbitmq"

# Run the application
npm run start:dev
```

**Option 2: With AWS SQS (LocalStack)**

```powershell
# Start LocalStack
docker-compose up -d localstack

# Wait for LocalStack to initialize (about 10 seconds)
Start-Sleep -Seconds 10

# Set environment for SQS
$env:QUEUE_PROVIDER="sqs"

# Run the application
npm run start:dev
```

**Option 3: With Both Queues**

```powershell
# Start both services
docker-compose up -d rabbitmq localstack

# Set environment to use both
$env:QUEUE_PROVIDER="both"

# Run the application
npm run start:dev
```

## 📡 API Endpoints

The API runs on `http://localhost:3000` by default.

### 1. Publish a Message

**Endpoint**: `POST /queue/publish`

**Request Body**:
```json
{
  "message": "Hello from the queue!",
  "metadata": {
    "userId": "user-123",
    "action": "2FA_REQUEST"
  }
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "abc123-def456",
  "queueIdentifier": "test-exchange/test-queue",
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

**PowerShell Example**:
```powershell
$body = @{
    message = "Test message for 2FA verification"
    metadata = @{
        userId = "user-456"
        phoneNumber = "+1234567890"
        code = "123456"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/queue/publish" -Method Post -Body $body -ContentType "application/json"
```

### 2. Receive Messages

**Endpoint**: `GET /queue/receive`

**Query Parameters**:
- `maxMessages` (optional): Maximum number of messages to retrieve (default: 10)
- `waitTimeSeconds` (optional): Long polling wait time (default: 10)

**Response**:
```json
{
  "success": true,
  "count": 2,
  "messages": [
    {
      "id": "msg-001",
      "body": {
        "message": "Hello from the queue!",
        "metadata": {
          "userId": "user-123"
        }
      },
      "attributes": {},
      "timestamp": "2025-11-19T10:30:00.000Z"
    }
  ],
  "queueIdentifier": "test-exchange/test-queue",
  "timestamp": "2025-11-19T10:31:00.000Z"
}
```

**PowerShell Example**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/queue/receive?maxMessages=5" -Method Get
```

### 3. Get Queue Information

**Endpoint**: `GET /queue/info`

**Response**:
```json
{
  "queueIdentifier": "test-exchange/test-queue",
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

**PowerShell Example**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/queue/info" -Method Get
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Application port | 3000 | No |
| `NODE_ENV` | Environment | development | No |
| `QUEUE_PROVIDER` | Queue provider: `sqs`, `rabbitmq`, or `both` | rabbitmq | Yes |
| **AWS SQS** |
| `AWS_REGION` | AWS region | us-east-1 | For SQS |
| `AWS_ACCESS_KEY_ID` | AWS access key | test | For SQS |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | test | For SQS |
| `AWS_ENDPOINT` | LocalStack endpoint | http://localhost:4566 | For SQS |
| `SQS_QUEUE_URL` | SQS queue URL | http://localhost:4566/000000000000/test-queue | For SQS |
| **RabbitMQ** |
| `RABBITMQ_URL` | RabbitMQ connection URL | amqp://guest:guest@localhost:5672 | For RabbitMQ |
| `RABBITMQ_QUEUE_NAME` | Queue name | test-queue | For RabbitMQ |
| `RABBITMQ_EXCHANGE_NAME` | Exchange name | test-exchange | For RabbitMQ |
| `RABBITMQ_ROUTING_KEY` | Routing key | test-routing-key | For RabbitMQ |

### Switching Queue Providers

Simply change the `QUEUE_PROVIDER` environment variable:

```powershell
# Use RabbitMQ
$env:QUEUE_PROVIDER="rabbitmq"

# Use AWS SQS
$env:QUEUE_PROVIDER="sqs"

# Use both simultaneously
$env:QUEUE_PROVIDER="both"
```

No code changes required! The application uses NestJS Dynamic Modules to inject the correct queue service at runtime.

## 🧪 Testing the Application

### Manual Testing with PowerShell

**1. Check if the service is running**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/queue/info"
```

**2. Publish multiple test messages**:
```powershell
for ($i = 1; $i -le 5; $i++) {
    $body = @{
        message = "Test message #$i"
        metadata = @{
            messageNumber = $i
            timestamp = (Get-Date).ToString()
        }
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:3000/queue/publish" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Published message #$i"
}
```

**3. Receive messages**:
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/queue/receive?maxMessages=10"
$response.messages | ForEach-Object {
    Write-Host "Message ID: $($_.id)"
    Write-Host "Body: $($_.body | ConvertTo-Json)"
    Write-Host "---"
}
```

### Testing with Both Queues

**1. Start both services**:
```powershell
docker-compose up -d rabbitmq localstack
```

**2. Set environment to use both**:
```powershell
$env:QUEUE_PROVIDER="both"
npm run start:dev
```

**3. Publish a message** (it will go to both SQS and RabbitMQ):
```powershell
$body = @{
    message = "Testing both queues!"
    metadata = @{ test = "dual-queue" }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/queue/publish" -Method Post -Body $body -ContentType "application/json"
```

**4. Receive from both queues**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/queue/receive"
```

## 🎯 Two-Factor Authentication Use Case

This API is designed with Two-Factor Authentication (2FA) scenarios in mind:

### Example: SMS OTP Verification Flow

**1. User requests 2FA code**:
```powershell
$request = @{
    message = "2FA_CODE_REQUEST"
    metadata = @{
        userId = "user-789"
        phoneNumber = "+1234567890"
        code = "654321"
        expiresAt = (Get-Date).AddMinutes(5).ToString()
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/queue/publish" -Method Post -Body $request -ContentType "application/json"
```

**2. Consumer processes the message** (in `queue-consumer.service.ts`):
- Validates the phone number
- Sends SMS via external service
- Logs the attempt
- Removes message from queue after successful processing

**3. Handle verification**:
```powershell
$verification = @{
    message = "2FA_CODE_VERIFY"
    metadata = @{
        userId = "user-789"
        code = "654321"
        submittedCode = "654321"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/queue/publish" -Method Post -Body $verification -ContentType "application/json"
```

## 🔍 Monitoring & Debugging

### RabbitMQ Management UI

Access the RabbitMQ management console at: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

### LocalStack (SQS) CLI Commands

```powershell
# Install AWS CLI tools
pip install awscli-local

# List queues
awslocal sqs list-queues --region us-east-1

# Get queue attributes
awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/test-queue --attribute-names All --region us-east-1

# Purge queue
awslocal sqs purge-queue --queue-url http://localhost:4566/000000000000/test-queue --region us-east-1
```

### Docker Logs

```powershell
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f rabbitmq
docker-compose logs -f localstack
docker-compose logs -f app
```

## 📊 Key Features

### ✅ Implemented

- [x] **Pluggable Queue Providers**: SQS and RabbitMQ implementations
- [x] **Zero-Code Provider Switching**: Environment variable-based configuration
- [x] **Dynamic Module Pattern**: NestJS Dynamic Modules for dependency injection
- [x] **Composite Queue Support**: Use both queues simultaneously
- [x] **REST API**: Publish and receive messages via HTTP endpoints
- [x] **Docker Compose Setup**: LocalStack (SQS) + RabbitMQ ready to go
- [x] **Message Acknowledgment**: Proper message deletion after processing
- [x] **Long Polling**: Configurable wait times for receiving messages
- [x] **Error Handling**: Comprehensive error logging and handling
- [x] **TypeScript**: Full type safety throughout the application

### 🔮 Future Enhancements

- [ ] Authentication & Authorization (JWT, API Keys)
- [ ] Message retry policies and dead letter queues
- [ ] Message priority and scheduling
- [ ] Batch operations (publish/receive multiple)
- [ ] WebSocket support for real-time updates
- [ ] Prometheus metrics and health checks
- [ ] Unit and integration tests
- [ ] Swagger/OpenAPI documentation
- [ ] Rate limiting and throttling

## 🤔 Considerations

### Q: How can I use both queues at once?

**A**: Set `QUEUE_PROVIDER=both` in your `.env` file. The `CompositeQueueService` will publish messages to both SQS and RabbitMQ, and consume from both queues simultaneously. This is useful for:
- Testing and comparing queue behaviors
- Migrating from one queue to another
- High availability scenarios

### Q: How can I write the app to test it and have queues ready?

**A**: Multiple approaches:

1. **Docker Compose (Recommended)**:
   ```powershell
   docker-compose up -d
   ```
   This starts LocalStack and RabbitMQ automatically with pre-configured queues.

2. **Local Development**:
   ```powershell
   docker-compose up -d rabbitmq localstack
   npm run start:dev
   ```

3. **Testing Different Providers**:
   ```powershell
   # Test RabbitMQ
   $env:QUEUE_PROVIDER="rabbitmq"; npm run start:dev
   
   # Test SQS
   $env:QUEUE_PROVIDER="sqs"; npm run start:dev
   
   # Test both
   $env:QUEUE_PROVIDER="both"; npm run start:dev
   ```

The LocalStack initialization script (`localstack-init/01-create-queue.sh`) automatically creates the SQS queue when the container starts.


### AI Usage

**Tools Used**: GitHub Copilot

**How AI Was Used**:
1. **Boilerplate Generation**: AI assisted in generating NestJS module structures, DTOs, and interfaces
2. **Documentation**: Helped structure the README
3. **Error Handling**: Suggested best practices for async error handling
4. **Concise & Professional** : Checked code quality and overall structure

**What I Wrote Manually**:
- Overall architecture design and queue abstraction pattern
- Dynamic Module configuration and provider selection logic
- Composite queue service pattern
- Docker Compose configuration
- Environment variable strategy
- Testing approach and examples

## 🚨 Troubleshooting

### Issue: LocalStack SQS queue not created

**Solution**:
```powershell
# Restart LocalStack
docker-compose restart localstack

# Check LocalStack logs
docker-compose logs localstack

# Manually create queue
awslocal sqs create-queue --queue-name test-queue --region us-east-1
```

### Issue: RabbitMQ connection refused

**Solution**:
```powershell
# Check if RabbitMQ is running
docker-compose ps

# Restart RabbitMQ
docker-compose restart rabbitmq

# Check RabbitMQ logs
docker-compose logs rabbitmq
```

### Issue: Cannot connect from Docker container

**Solution**: When running the app in Docker, use service names instead of `localhost`:
- SQS: `http://localstack:4566`
- RabbitMQ: `amqp://guest:guest@rabbitmq:5672`

## 📦 Dependencies

### Production Dependencies
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` - NestJS framework
- `@nestjs/config` - Configuration management
- `@aws-sdk/client-sqs` - AWS SQS client (v3)
- `amqplib`, `amqp-connection-manager` - RabbitMQ client
- `class-validator`, `class-transformer` - DTO validation
- `rxjs` - Reactive programming

### Development Dependencies
- `@nestjs/cli` - NestJS CLI tools
- TypeScript and ESLint tooling
- Jest for testing


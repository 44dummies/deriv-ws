/**
 * TraderMind OpenAPI/Swagger Documentation
 * API specification for the TraderMind platform
 */

import { Router, Request, Response } from 'express';

const router = Router();

// OpenAPI 3.0 Specification
const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'TraderMind API',
        description: 'Professional quantitative trading platform API for Volatility and Jump indices',
        version: '2.0.0',
        contact: {
            name: 'TraderMind Support',
            email: 'support@tradermind.io'
        }
    },
    servers: [
        {
            url: '/api/v1',
            description: 'API v1'
        }
    ],
    tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Sessions', description: 'Trading session management' },
        { name: 'Users', description: 'User management' },
        { name: 'Trades', description: 'Trade operations' },
        { name: 'Stats', description: 'Statistics and analytics' },
        { name: 'Markets', description: 'Market data and analysis' }
    ],
    paths: {
        '/auth/deriv/callback': {
            post: {
                tags: ['Auth'],
                summary: 'Authenticate with Deriv OAuth',
                description: 'Validates Deriv token and creates a session',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['deriv_token', 'account_id'],
                                properties: {
                                    deriv_token: { type: 'string', description: 'OAuth token from Deriv' },
                                    account_id: { type: 'string', description: 'Deriv account ID' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Authentication successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        accessToken: { type: 'string' },
                                        user: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                email: { type: 'string' },
                                                role: { type: 'string', enum: ['USER', 'ADMIN'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Invalid Deriv token' },
                    '503': { description: 'Deriv connectivity error' }
                }
            }
        },
        '/sessions': {
            get: {
                tags: ['Sessions'],
                summary: 'List all sessions',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'List of sessions',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Session' }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ['Sessions'],
                summary: 'Create a new trading session',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    config: { $ref: '#/components/schemas/SessionConfig' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Session created',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Session' }
                            }
                        }
                    }
                }
            }
        },
        '/sessions/{sessionId}': {
            get: {
                tags: ['Sessions'],
                summary: 'Get session details',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'sessionId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Session details',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Session' }
                            }
                        }
                    },
                    '404': { description: 'Session not found' }
                }
            }
        },
        '/sessions/{sessionId}/join': {
            post: {
                tags: ['Sessions'],
                summary: 'Join a trading session',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'sessionId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Successfully joined session' },
                    '404': { description: 'Session not found' },
                    '409': { description: 'Already in session' }
                }
            }
        },
        '/trades': {
            get: {
                tags: ['Trades'],
                summary: 'Get trade history',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'sessionId',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', default: 50 }
                    }
                ],
                responses: {
                    '200': {
                        description: 'List of trades',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Trade' }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/stats/summary': {
            get: {
                tags: ['Stats'],
                summary: 'Get trading statistics summary',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Statistics summary',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/StatsSummary' }
                            }
                        }
                    }
                }
            }
        },
        '/chat': {
            post: {
                tags: ['Chat'],
                summary: 'Send message to AI assistant',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['message'],
                                properties: {
                                    message: { type: 'string' },
                                    context: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'AI response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        response: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/csrf-token': {
            get: {
                tags: ['Auth'],
                summary: 'Get CSRF token',
                responses: {
                    '200': {
                        description: 'CSRF token',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        csrfToken: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/status': {
            get: {
                tags: ['System'],
                summary: 'API health check',
                responses: {
                    '200': {
                        description: 'API is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'ok' },
                                        timestamp: { type: 'string', format: 'date-time' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            Session: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    status: { 
                        type: 'string', 
                        enum: ['PENDING', 'ACTIVE', 'RUNNING', 'PAUSED', 'COMPLETED'] 
                    },
                    config_json: { $ref: '#/components/schemas/SessionConfig' },
                    created_at: { type: 'string', format: 'date-time' },
                    started_at: { type: 'string', format: 'date-time', nullable: true },
                    completed_at: { type: 'string', format: 'date-time', nullable: true },
                    participants: { 
                        type: 'array',
                        items: { $ref: '#/components/schemas/Participant' }
                    }
                }
            },
            SessionConfig: {
                type: 'object',
                properties: {
                    max_participants: { type: 'integer' },
                    min_balance: { type: 'number' },
                    risk_profile: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                    allowed_markets: { type: 'array', items: { type: 'string' } },
                    global_loss_threshold: { type: 'number' }
                }
            },
            Participant: {
                type: 'object',
                properties: {
                    user_id: { type: 'string' },
                    status: { 
                        type: 'string', 
                        enum: ['PENDING', 'ACTIVE', 'FAILED', 'REMOVED', 'OPTED_OUT'] 
                    },
                    pnl: { type: 'number' },
                    joined_at: { type: 'string', format: 'date-time' }
                }
            },
            Trade: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    session_id: { type: 'string' },
                    user_id: { type: 'string' },
                    market: { type: 'string' },
                    type: { type: 'string', enum: ['CALL', 'PUT'] },
                    stake: { type: 'number' },
                    status: { type: 'string', enum: ['WIN', 'LOSS', 'TIE', 'FAILED', 'PENDING'] },
                    profit: { type: 'number' },
                    executed_at: { type: 'string', format: 'date-time' }
                }
            },
            StatsSummary: {
                type: 'object',
                properties: {
                    total_trades: { type: 'integer' },
                    win_rate: { type: 'number' },
                    total_pnl: { type: 'number' },
                    avg_profit: { type: 'number' },
                    sessions_count: { type: 'integer' }
                }
            },
            Signal: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['CALL', 'PUT'] },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    reason: { type: 'string' },
                    market: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                }
            }
        }
    }
};

// Swagger UI HTML template
const swaggerHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>TraderMind API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body { margin: 0; background: #0a0f1c; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui { 
            font-family: system-ui, -apple-system, sans-serif;
        }
        .swagger-ui .info .title { color: #3b82f6; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: '/api/v1/docs/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [SwaggerUIBundle.presets.apis],
            layout: "BaseLayout"
        });
    </script>
</body>
</html>
`;

// Routes
router.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
});

router.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(swaggerHtml);
});

export default router;

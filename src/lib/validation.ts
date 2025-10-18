import { z } from 'zod';

// ===== COMMON SCHEMAS =====

export const emailSchema = z.string().email('Invalid email format').min(1, 'Email is required');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters');

export const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^\+?[\d\s\-()]{10,15}$/.test(val), 'Invalid phone number format');

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)');

export const mongoIdSchema = z
  .string()
  .min(1, 'ID is required')
  .max(50, 'ID too long');

// ===== AUTH SCHEMAS =====

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema,
  phone: phoneSchema,
  dob: dateSchema.optional(),
  country: z.string().max(100).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
});

// ===== USER MANAGEMENT SCHEMAS =====

export const userUpdateSchema = z.object({
  userId: mongoIdSchema,
  action: z.enum(['ban', 'unban', 'suspend', 'activate', 'assignRole']),
  reason: z.string().max(500).optional(),
  role: z.string().max(50).optional()
}).refine((data) => {
  if (data.action === 'ban' && !data.reason) return false;
  if (data.action === 'assignRole' && !data.role) return false;
  return true;
}, {
  message: 'Ban reason is required for ban action, role is required for assignRole action'
});

export const profileUpdateSchema = z.object({
  fullName: nameSchema,
  phone: phoneSchema,
  dob: dateSchema.optional(),
  country: z.string().max(100).optional()
});

// ===== MOVIE SCHEMAS =====

export const movieSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  synopsis: z.string().max(2000, 'Synopsis too long').optional(),
  poster: urlSchema.optional(),
  backdrop: urlSchema.optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 5).optional(),
  rating: z.number().min(0).max(10).optional(),
  durationMins: z.number().int().min(1).max(600).optional(),
  releaseDate: dateSchema.optional(),
  languages: z.array(z.string().max(50)).max(20).optional(),
  formats: z.array(z.string().max(50)).max(10).optional(),
  published: z.boolean().optional()
});

export const movieUpdateSchema = movieSchema.partial().extend({
  id: mongoIdSchema
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long')
});

// ===== THEATRE SCHEMAS =====

export const theatreSchema = z.object({
  name: z.string().min(1, 'Theatre name is required').max(200, 'Theatre name too long'),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional()
});

export const theatreUpdateSchema = theatreSchema.partial().extend({
  id: mongoIdSchema
});

// ===== SHOW SCHEMAS =====

export const showSchema = z.object({
  movieId: mongoIdSchema,
  theatreId: mongoIdSchema,
  dateKey: dateSchema,
  time: timeSchema,
  format: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  prices: z.string().min(1, 'Prices are required'),
  published: z.boolean().optional()
});

export const showUpdateSchema = showSchema.partial().extend({
  id: mongoIdSchema
});

// ===== BOOKING SCHEMAS =====

export const bookingSchema = z.object({
  movieId: mongoIdSchema,
  theatreId: mongoIdSchema,
  showId: mongoIdSchema,
  seats: z.array(z.string()).min(1, 'At least one seat required').max(10, 'Too many seats'),
  userEmail: emailSchema
});

export const bookingUpdateSchema = z.object({
  ticketId: mongoIdSchema,
  action: z.enum(['cancel', 'refund', 'modify']),
  reason: z.string().max(500).optional(),
  refundAmount: z.number().min(0).optional(),
  newSeats: z.array(z.string()).optional()
});

// ===== NOTIFICATION SCHEMAS =====

export const notificationTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Template name too long'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  type: z.enum(['general', 'booking', 'promotional', 'system']),
  variables: z.array(z.string().max(50)).max(20).optional(),
  isActive: z.boolean().optional()
});

export const notificationCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200, 'Campaign name too long'),
  templateId: mongoIdSchema,
  userSegment: z.enum(['all', 'active', 'recent_bookers', 'high_spenders', 'inactive', 'custom']),
  customUsers: z.array(z.object({
    id: mongoIdSchema,
    email: emailSchema,
    fullName: nameSchema
  })).optional(),
  scheduledAt: z.string().datetime().optional(),
  variables: z.record(z.string().max(500)).optional()
});

// ===== ADMIN SCHEMAS =====

export const logFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userEmail: z.string().max(255).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  path: z.string().max(500).optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  requestId: z.string().max(100).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']).optional(),
  category: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  resourceType: z.string().max(100).optional(),
  search: z.string().max(500).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional()
});

// ===== PRICING SCHEMAS =====

export const pricingTierSchema = z.object({
  name: z.string().min(1, 'Tier name is required').max(100, 'Tier name too long'),
  multiplier: z.number().min(0.1).max(10),
  description: z.string().max(500).optional()
});

// ===== VALIDATION MIDDLEWARE =====

export function validateRequest<T extends z.ZodType>(schema: T) {
  return (req: any): z.infer<T> => {
    try {
      return schema.parse(req);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  };
}

export function validateBody<T extends z.ZodType>(schema: T) {
  return async (req: Request): Promise<z.infer<T>> => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON in request body');
      }
      throw error;
    }
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request): z.infer<T> => {
    try {
      const url = new URL(req.url);
      const params = Object.fromEntries(url.searchParams.entries());
      
      // Convert string numbers to numbers for validation
      const processedParams: any = {};
      for (const [key, value] of Object.entries(params)) {
        if (value === '') {
          processedParams[key] = undefined;
        } else if (!isNaN(Number(value)) && value.trim() !== '') {
          processedParams[key] = Number(value);
        } else if (value === 'true') {
          processedParams[key] = true;
        } else if (value === 'false') {
          processedParams[key] = false;
        } else {
          processedParams[key] = value;
        }
      }
      
      return schema.parse(processedParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Query validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  };
}

// ===== SANITIZATION HELPERS =====

export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

export function validateAndSanitizeInput(input: any, schema: z.ZodType): any {
  const validated = schema.parse(input);
  
  // Recursively sanitize string fields
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }
  
  return sanitizeObject(validated);
}
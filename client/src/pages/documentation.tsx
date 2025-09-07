import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  Package, 
  Server, 
  Zap, 
  Database, 
  Globe, 
  Settings, 
  Code, 
  ExternalLink,
  Copy,
  BookOpen,
  Terminal,
  Layers,
  Cloud
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Documentation = () => {
  const [copiedText, setCopiedText] = useState<string>("");
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedText(""), 2000);
  };

  const frontendDependencies = [
    {
      name: "React",
      version: "^18.0.0",
      description: "Core UI framework for building user interfaces",
      category: "Core Framework",
      usage: "Main component library, state management, virtual DOM"
    },
    {
      name: "TypeScript",
      version: "^5.0.0",
      description: "Type-safe JavaScript development",
      category: "Core Framework",
      usage: "Type checking, IntelliSense, compile-time error catching"
    },
    {
      name: "Vite",
      version: "^5.0.0",
      description: "Fast build tool and development server",
      category: "Build Tools",
      usage: "Hot module replacement, bundling, development server"
    },
    {
      name: "Tailwind CSS",
      version: "^3.0.0",
      description: "Utility-first CSS framework",
      category: "Styling",
      usage: "Component styling, responsive design, dark mode"
    },
    {
      name: "Shadcn/UI",
      version: "Latest",
      description: "Component library built on Radix UI primitives",
      category: "UI Components",
      usage: "Pre-built accessible components, form handling"
    },
    {
      name: "Radix UI",
      version: "^1.0.0",
      description: "Low-level accessible UI primitives",
      category: "UI Components",
      usage: "Accordion, Dialog, Dropdown, Toast, Form components"
    },
    {
      name: "TanStack React Query",
      version: "^5.0.0",
      description: "Data fetching and caching library",
      category: "State Management",
      usage: "API calls, caching, background refetching, optimistic updates"
    },
    {
      name: "Wouter",
      version: "^3.0.0",
      description: "Lightweight client-side routing",
      category: "Routing",
      usage: "Page navigation, route matching, history management"
    },
    {
      name: "React Hook Form",
      version: "^7.0.0",
      description: "Performant forms with easy validation",
      category: "Forms",
      usage: "Form state management, validation, error handling"
    },
    {
      name: "Lucide React",
      version: "^0.400.0",
      description: "Beautiful SVG icon library",
      category: "Icons",
      usage: "UI icons, action indicators, visual elements"
    },
    {
      name: "Chart.js",
      version: "^4.0.0",
      description: "Data visualization and charting",
      category: "Data Visualization",
      usage: "Analytics charts, performance graphs, KPI dashboards"
    },
    {
      name: "React Chartjs-2",
      version: "^5.0.0",
      description: "React wrapper for Chart.js",
      category: "Data Visualization",
      usage: "Integration of Chart.js with React components"
    },
    {
      name: "Framer Motion",
      version: "^11.0.0",
      description: "Animation library for React",
      category: "Animations",
      usage: "Page transitions, component animations, gesture handling"
    },
    {
      name: "Date-fns",
      version: "^3.0.0",
      description: "Modern JavaScript date utility library",
      category: "Utilities",
      usage: "Date formatting, calculations, timezone handling"
    }
  ];

  const backendDependencies = [
    {
      name: "Node.js",
      version: "^20.0.0",
      description: "JavaScript runtime for server-side development",
      category: "Runtime",
      usage: "Server execution environment, NPM package management"
    },
    {
      name: "Express.js",
      version: "^4.18.0",
      description: "Fast, unopinionated web framework",
      category: "Web Framework",
      usage: "API routes, middleware, request/response handling"
    },
    {
      name: "TypeScript",
      version: "^5.0.0",
      description: "Type-safe JavaScript for backend",
      category: "Language",
      usage: "Type checking, API contract definitions, error prevention"
    },
    {
      name: "Drizzle ORM",
      version: "^0.30.0",
      description: "Type-safe SQL ORM with excellent TypeScript support",
      category: "Database",
      usage: "Database queries, migrations, type-safe operations"
    },
    {
      name: "PostgreSQL",
      version: "^14.0.0",
      description: "Advanced open-source relational database",
      category: "Database",
      usage: "Data storage, transactions, complex queries, JSON support"
    },
    {
      name: "@neondatabase/serverless",
      version: "^0.9.0",
      description: "Serverless PostgreSQL driver for Neon",
      category: "Database",
      usage: "Database connection pooling, serverless compatibility"
    },
    {
      name: "Express Session",
      version: "^1.18.0",
      description: "Session middleware for Express",
      category: "Authentication",
      usage: "User session management, login state persistence"
    },
    {
      name: "Connect PG Simple",
      version: "^9.0.0",
      description: "PostgreSQL session store",
      category: "Authentication",
      usage: "Database-backed session storage, scalable sessions"
    },
    {
      name: "Passport",
      version: "^0.7.0",
      description: "Authentication middleware",
      category: "Authentication",
      usage: "OAuth integration, user authentication strategies"
    },
    {
      name: "Axios",
      version: "^1.6.0",
      description: "HTTP client for API requests",
      category: "HTTP Client",
      usage: "External API calls, request/response interceptors"
    },
    {
      name: "Zod",
      version: "^3.22.0",
      description: "TypeScript-first schema validation",
      category: "Validation",
      usage: "API request validation, type inference, error handling"
    },
    {
      name: "Node Cron",
      version: "^3.0.0",
      description: "Cron job scheduler for Node.js",
      category: "Scheduling",
      usage: "Automated tasks, content posting, monitoring schedules"
    },
    {
      name: "Multer",
      version: "^1.4.0",
      description: "Middleware for handling multipart/form-data",
      category: "File Upload",
      usage: "File uploads, image processing, media handling"
    }
  ];

  const aiServiceDependencies = [
    {
      name: "@google/genai",
      version: "^0.15.0",
      description: "Google Gemini AI SDK",
      category: "AI Services",
      usage: "Japanese content generation, script optimization, dynamic seeds"
    },
    {
      name: "@google-cloud/text-to-speech",
      version: "^5.0.0",
      description: "Google Cloud Text-to-Speech API",
      category: "AI Services",
      usage: "Japanese voice synthesis, audio content generation"
    },
    {
      name: "@google-cloud/storage",
      version: "^7.0.0",
      description: "Google Cloud Storage client",
      category: "Cloud Storage",
      usage: "Media file storage, CDN distribution, object management"
    },
    {
      name: "@google-cloud/bigquery",
      version: "^7.0.0",
      description: "Google BigQuery client for analytics",
      category: "Analytics",
      usage: "Data warehousing, performance analytics, ROI tracking"
    },
    {
      name: "@google-cloud/workflows",
      version: "^3.0.0",
      description: "Google Cloud Workflows for automation",
      category: "Automation",
      usage: "Content pipeline orchestration, workflow automation"
    },
    {
      name: "@google-cloud/pubsub",
      version: "^4.0.0",
      description: "Google Cloud Pub/Sub messaging",
      category: "Messaging",
      usage: "Event-driven architecture, real-time notifications"
    },
    {
      name: "@google-cloud/scheduler",
      version: "^4.0.0",
      description: "Google Cloud Scheduler for cron jobs",
      category: "Scheduling",
      usage: "Automated content posting, performance monitoring"
    }
  ];

  const environmentVariables = [
    {
      name: "DATABASE_URL",
      description: "PostgreSQL connection string",
      required: true,
      example: "postgresql://user:password@host:5432/database",
      category: "Database"
    },
    {
      name: "GEMINI_API_KEY",
      description: "Google Gemini AI API key for content generation",
      required: true,
      example: "AIza***************************",
      category: "AI Services"
    },
    {
      name: "TIKTOK_CLIENT_KEY",
      description: "TikTok API client key for social media integration",
      required: false,
      example: "aw*********************",
      category: "Social Media"
    },
    {
      name: "TIKTOK_CLIENT_SECRET",
      description: "TikTok API client secret",
      required: false,
      example: "**************************",
      category: "Social Media"
    },
    {
      name: "INSTAGRAM_CLIENT_ID",
      description: "Instagram API client ID",
      required: false,
      example: "123456789012345",
      category: "Social Media"
    },
    {
      name: "INSTAGRAM_CLIENT_SECRET",
      description: "Instagram API client secret",
      required: false,
      example: "**************************",
      category: "Social Media"
    },
    {
      name: "MOCHI_API_KEY",
      description: "Mochi AI video generation API key",
      required: false,
      example: "mochi_*********************",
      category: "AI Services"
    },
    {
      name: "LUMA_API_KEY",
      description: "Luma Dream Machine API key",
      required: false,
      example: "luma_**********************",
      category: "AI Services"
    },
    {
      name: "SESSION_SECRET",
      description: "Secret key for session encryption",
      required: true,
      example: "your-super-secret-session-key-here",
      category: "Security"
    },
    {
      name: "NODE_ENV",
      description: "Application environment (development/production)",
      required: true,
      example: "development",
      category: "Environment"
    }
  ];

  const setupSteps = [
    {
      title: "1. Clone and Install",
      commands: [
        "git clone <repository-url>",
        "cd mnp-dashboard",
        "npm install"
      ],
      description: "Download the project and install all dependencies"
    },
    {
      title: "2. Environment Configuration",
      commands: [
        "cp .env.example .env",
        "# Edit .env with your API keys and database URL"
      ],
      description: "Set up environment variables for external services"
    },
    {
      title: "3. Database Setup",
      commands: [
        "npm run db:push",
        "# Creates all required tables automatically"
      ],
      description: "Initialize PostgreSQL database with schema"
    },
    {
      title: "4. Development Server",
      commands: [
        "npm run dev",
        "# Starts both frontend and backend on port 5000"
      ],
      description: "Launch the development environment"
    },
    {
      title: "5. API Configuration",
      commands: [
        "# Visit /api-setup in your browser",
        "# Follow setup guides for each service"
      ],
      description: "Configure external API integrations"
    }
  ];

  const architectureComponents = [
    {
      name: "Frontend (React + TypeScript)",
      description: "Modern React application with TypeScript for type safety",
      technologies: ["React 18", "TypeScript", "Vite", "Tailwind CSS"],
      responsibilities: ["User interface", "State management", "API communication", "Real-time updates"]
    },
    {
      name: "Backend API (Express + TypeScript)",
      description: "RESTful API server with TypeScript for backend logic",
      technologies: ["Express.js", "TypeScript", "Drizzle ORM", "PostgreSQL"],
      responsibilities: ["API routes", "Business logic", "Database operations", "Authentication"]
    },
    {
      name: "Database Layer (PostgreSQL + Drizzle)",
      description: "Type-safe database operations with Drizzle ORM",
      technologies: ["PostgreSQL", "Drizzle ORM", "Zod validation"],
      responsibilities: ["Data persistence", "Migrations", "Query optimization", "Type safety"]
    },
    {
      name: "AI Services Integration",
      description: "Google Cloud AI services for content generation",
      technologies: ["Google Gemini", "Cloud TTS", "Cloud Storage"],
      responsibilities: ["Content generation", "Voice synthesis", "Media storage", "AI optimization"]
    },
    {
      name: "Social Media APIs",
      description: "Integration with TikTok and Instagram platforms",
      technologies: ["TikTok API", "Instagram API", "OAuth 2.0"],
      responsibilities: ["Content posting", "Account management", "Analytics", "Automation"]
    },
    {
      name: "Automation Engine",
      description: "Content workflow automation and scheduling",
      technologies: ["Node Cron", "Google Workflows", "Custom schedulers"],
      responsibilities: ["Content scheduling", "Performance monitoring", "ROI optimization", "Alert system"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-500" />
            System Documentation
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Comprehensive guide to libraries, dependencies, and system architecture
          </p>
        </div>

        <Tabs defaultValue="dependencies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dependencies" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Dependencies
            </TabsTrigger>
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Environment
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Setup Guide
            </TabsTrigger>
            <TabsTrigger value="architecture" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="deployment" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Deployment
            </TabsTrigger>
          </TabsList>

          {/* Dependencies Tab */}
          <TabsContent value="dependencies" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Frontend Dependencies */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-blue-500" />
                    Frontend Dependencies
                  </CardTitle>
                  <CardDescription>
                    React ecosystem and UI libraries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {frontendDependencies.map((dep) => (
                    <div key={dep.name} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{dep.name}</h4>
                        <Badge variant="secondary" className="text-xs">{dep.version}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{dep.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{dep.category}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 italic">{dep.usage}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Backend Dependencies */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-green-500" />
                    Backend Dependencies
                  </CardTitle>
                  <CardDescription>
                    Server-side libraries and frameworks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {backendDependencies.map((dep) => (
                    <div key={dep.name} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{dep.name}</h4>
                        <Badge variant="secondary" className="text-xs">{dep.version}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{dep.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{dep.category}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 italic">{dep.usage}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* AI Services Dependencies */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    AI & Cloud Services
                  </CardTitle>
                  <CardDescription>
                    Google Cloud and AI integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiServiceDependencies.map((dep) => (
                    <div key={dep.name} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{dep.name}</h4>
                        <Badge variant="secondary" className="text-xs">{dep.version}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{dep.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{dep.category}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 italic">{dep.usage}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Environment Tab */}
          <TabsContent value="environment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-orange-500" />
                  Environment Variables
                </CardTitle>
                <CardDescription>
                  Required and optional environment configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {environmentVariables.map((env) => (
                    <div key={env.name} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{env.name}</h4>
                        <div className="flex items-center gap-2">
                          {env.required ? (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Optional</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{env.category}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{env.description}</p>
                      <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                        <code className="text-xs font-mono flex-1">{env.example}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(env.name, env.name)}
                          data-testid={`button-copy-${env.name.toLowerCase()}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Setup Guide Tab */}
          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-green-500" />
                  Installation & Setup Guide
                </CardTitle>
                <CardDescription>
                  Step-by-step instructions to get the system running
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {setupSteps.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <h3 className="font-semibold text-lg">{step.title}</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 ml-11">{step.description}</p>
                    <div className="ml-11 space-y-2">
                      {step.commands.map((command, cmdIndex) => (
                        <div key={cmdIndex} className="flex items-center gap-2 p-2 bg-slate-900 dark:bg-slate-800 rounded-md">
                          <code className="text-green-400 font-mono text-sm flex-1">{command}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(command, "Command")}
                            className="text-white hover:bg-slate-700"
                            data-testid={`button-copy-command-${index}-${cmdIndex}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-500" />
                  System Architecture
                </CardTitle>
                <CardDescription>
                  Overview of system components and their interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {architectureComponents.map((component) => (
                    <div key={component.name} className="border rounded-lg p-4 space-y-4">
                      <h3 className="font-semibold text-lg">{component.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{component.description}</p>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Technologies:</h4>
                        <div className="flex flex-wrap gap-1">
                          {component.technologies.map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Responsibilities:</h4>
                        <ul className="space-y-1">
                          {component.responsibilities.map((responsibility, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                              <span className="text-xs text-slate-600 dark:text-slate-400">{responsibility}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deployment Tab */}
          <TabsContent value="deployment" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-blue-500" />
                    Production Deployment
                  </CardTitle>
                  <CardDescription>
                    Guidelines for deploying to production
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Prerequisites</h4>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          PostgreSQL database configured
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Environment variables set
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          API keys configured
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Domain name configured
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Build Commands</h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-slate-900 rounded-md">
                          <code className="text-green-400 text-sm">npm run build</code>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-md">
                          <code className="text-green-400 text-sm">npm start</code>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <Cloud className="h-4 w-4" />
                      <AlertDescription>
                        Ensure all API keys are properly configured in your production environment for full functionality.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-500" />
                    Database Setup
                  </CardTitle>
                  <CardDescription>
                    Production database configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Required Tables</h4>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          users, sessions (authentication)
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          affiliate_programs, affiliate_links
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          social_media_accounts, posting_schedules
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          gemini_seeds, optimization_events
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          bandit_arms, automation_logs
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Migration Command</h4>
                      <div className="p-2 bg-slate-900 rounded-md">
                        <code className="text-green-400 text-sm">npm run db:push</code>
                      </div>
                    </div>

                    <Alert>
                      <Database className="h-4 w-4" />
                      <AlertDescription>
                        Always backup your database before running migrations in production.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Documentation;
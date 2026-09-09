process.env.NODE_ENV = 'production';
process.env.LOCAL_DEMO_MODE = 'true';
process.env.PORT = process.env.PORT || '3000';
import('./dist/index.js');

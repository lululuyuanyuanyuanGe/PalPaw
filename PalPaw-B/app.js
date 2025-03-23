// Express.js related middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add body parser limit configuration
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure multipart handling at the Express level
app.use((req, res, next) => {
  // Only apply to multipart requests
  if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
    console.log('Configuring multipart request handling:', req.url);
    // Set timeouts for multipart form handling
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
  }
  next();
}); 
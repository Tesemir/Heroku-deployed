const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const NEWS_API_KEY = process.env.NEWS_API_KEY;

mongoose.connect('mongodb://localhost:27017/books')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: Number, required: true },
  genre: { type: String, required: true },
});

const Book = mongoose.model('Book', bookSchema);

// GET /books
app.get('/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// News API Endpoint - Fetch news based on query parameters
app.get('/news', async (req, res) => {
  try {
      const { query, category, country } = req.query;

      // Construct API URL with user parameters
      const apiUrl = `https://newsapi.org/v2/top-headlines?${query ? `q=${query}&` : ''}${category ? `category=${category}&` : ''}${country ? `country=${country}&` : ''}apiKey=${NEWS_API_KEY}`;

      // Use fetch to get data from NewsAPI
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (response.ok) {
          const articles = data.articles.map(article => ({
              title: article.title,
              description: article.description,
              source: article.source.name,
              url: article.url,
              publishedAt: article.publishedAt
          }));

          // Pretty-print JSON with 2 spaces for indentation
          res.json(JSON.stringify({ totalResults: data.totalResults, articles }, null, 2));
      } else {
          res.status(500).json({ error: "Error fetching news. Try again later." });
      }
  } catch (error) {
      res.status(500).json({ error: "Error fetching news. Try again later." });
  }
});

// POST /books
app.post('/books', async (req, res) => {
  const { title, author, year, genre } = req.body;

  // Input validation
  if (!title || !author || !year || !genre) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const newBook = new Book({
      title,
      author,
      year,
      genre,
    });
    
    await newBook.save();
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /books/:id
app.put('/books/:id', async (req, res) => {
  const { id } = req.params;
  const { title, author, year, genre } = req.body;

  if (!title || !author || !year || !genre) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const book = await Book.findByIdAndUpdate(id, { title, author, year, genre }, { new: true });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /books/:id
app.delete('/books/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const book = await Book.findByIdAndDelete(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'News and Book API Documentation',
      version: '1.0.0',
      description: 'API to manage books and fetch news articles based on query, category, and country.',
    },
  },
  apis: ['./server.js'],
};

const specs = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /news:
 *   get:
 *     summary: Fetch news articles based on query parameters
 *     parameters:
 *       - in: query
 *         name: query
 *         required: false
 *         schema:
 *           type: string
 *         description: The search term to filter news articles.
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: The category of news (e.g., technology, sports).
 *       - in: query
 *         name: country
 *         required: false
 *         schema:
 *           type: string
 *         description: The country of the news (e.g., us, gb).
 *     responses:
 *       200:
 *         description: A list of news articles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalResults:
 *                   type: integer
 *                 articles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       source:
 *                         type: string
 *                       url:
 *                         type: string
 *                       publishedAt:
 *                         type: string
 */

/**
 * @swagger
 * /books:
 *   get:
 *     summary: Fetch all books
 *     responses:
 *       200:
 *         description: A list of books
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   author:
 *                     type: string
 *                   year:
 *                     type: number
 *                   genre:
 *                     type: string
 */

/**
 * @swagger
 * /books:
 *   post:
 *     summary: Add a new book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               year:
 *                 type: number
 *               genre:
 *                 type: string
 *     responses:
 *       201:
 *         description: Book created successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /books/{id}:
 *   put:
 *     summary: Update a book’s details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The book's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               year:
 *                 type: number
 *               genre:
 *                 type: string
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Book not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /books/{id}:
 *   delete:
 *     summary: Delete a book
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The book's ID
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *       404:
 *         description: Book not found
 *       500:
 *         description: Server error
 */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

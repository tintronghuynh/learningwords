/**
 * Simple JavaScript utility functions
 * This file can be executed with Node.js or included in an HTML file
 * No server setup or port configuration required
 */

// Collection of utility functions
const utils = {
  /**
   * Validates if a string is a valid email address
   * @param {string} email - Email address to validate
   * @return {boolean} - True if valid email, false otherwise
   */
  isValidEmail: function(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Formats a number as currency
   * @param {number} amount - Amount to format
   * @param {string} currencyCode - Currency code (default: USD)
   * @param {string} locale - Locale for formatting (default: en-US)
   * @return {string} - Formatted currency string
   */
  formatCurrency: function(amount, currencyCode = 'USD', locale = 'en-US') {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  },

  /**
   * Generates a random string of specified length
   * @param {number} length - Length of the string to generate
   * @return {string} - Random string
   */
  generateRandomString: function(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  },

  /**
   * Deep clones an object
   * @param {Object} obj - Object to clone
   * @return {Object} - Cloned object
   */
  deepClone: function(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Debounces a function call
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @return {Function} - Debounced function
   */
  debounce: function(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Truncates a string to a specified length and adds ellipsis
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @return {string} - Truncated string
   */
  truncateString: function(str, maxLength = 50) {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }
};

// Example of how to use the utils object in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = utils;
  
  // Example usage when run directly with Node.js
  if (require.main === module) {
    console.log('Utility functions loaded successfully!');
    console.log('Example usage:');
    console.log(`- Is 'test@example.com' a valid email? ${utils.isValidEmail('test@example.com')}`);
    console.log(`- Formatted currency: ${utils.formatCurrency(1234.56)}`);
    console.log(`- Random string: ${utils.generateRandomString()}`);
    console.log(`- Truncated string: ${utils.truncateString('This is a very long string that will be truncated', 20)}`);
  }
}

// If running in browser, attach to window object
if (typeof window !== 'undefined') {
  window.utils = utils;
}

/**
 * How to use this file:
 * 
 * In Node.js:
 * 1. const utils = require('./utils.js');
 * 2. utils.isValidEmail('example@example.com');
 * 
 * In Browser:
 * 1. <script src="utils.js"></script>
 * 2. <script>
 *      utils.isValidEmail('example@example.com');
 *    </script>
 */

# Transaction Class

The Transaction class is a utility that allows you to create transactions for managing changes to an object's properties. It provides methods to start, commit, and rollback transactions, as well as events to track changes.

## Features

- Create and manage transactions for an object's properties.
- Emit events for actions such as getting, setting, deleting, committing, rolling back, and timeout.
- Handle transaction timeout, automatically committing or rolling back changes after a specified duration.
- Revocable proxy object to track property changes.

## Installation

To install and use `dataset-transaction`, follow these steps:

```bash
    npm install dataset-transaction
```

## Usage

Here's a quick example demonstrating how to use the `Transaction` class:

```javascript
const { Transaction } = require('dataset-transaction');

// Create initial data
const data = {
  name: 'John Doe',
  age: 30,
  email: 'johndoe@example.com',
};

// Start a transaction
const { transaction, proxy } = Transaction.start(data);

// Listen to events
transaction.on('get', () => {
  console.log('Property accessed.');
});

transaction.on('set', () => {
  console.log('Property set.');
});

transaction.on('delete', () => {
  console.log('Property deleted.');
});

transaction.on('commit', () => {
  console.log('Transaction committed.');
});

transaction.on('rollback', () => {
  console.log('Transaction rolled back.');
});

transaction.on('timeout', () => {
  console.log('Transaction timed out.');
});

// Access and modify the properties using the proxy
const name = proxy.name; // This will trigger 'get' event
proxy.age = 31; // This will trigger 'set' event
transaction.delete('email'); // This will trigger 'delete' event

// Commit or rollback the transaction
transaction.commit(); // This will trigger 'commit' event
transaction.rollback(); // This will trigger 'rollback' event

// Stop the transaction
transaction.stop();
```

## License

[MIT LICENSE](https://github.com/timursevimli/dataset-transaction/blob/main/LICENSE)

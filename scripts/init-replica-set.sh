#!/bin/bash
# MongoDB Replica Set Initialization Script
# This script initializes a single-node replica set for local development

echo "Waiting for MongoDB to start..."
sleep 15

echo "Initializing replica set..."
mongosh --quiet --eval "
try {
  const status = rs.status();
  console.log('Replica set already initialized');
} catch (error) {
  if (error.codeName === 'NotYetInitialized') {
    rs.initiate({
      _id: 'rs0',
      members: [{ _id: 0, host: 'localhost:27017' }]
    });
    console.log('Replica set initialized successfully');
  } else {
    console.error('Error checking/initializing replica set:', error);
  }
}
" && echo "Replica set initialization complete"

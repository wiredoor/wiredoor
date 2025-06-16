const fs = require('fs');

module.exports = async () => {
  const dbPath = '/tmp/test.sqlite';

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted old test.sqlite after tests');
  }
};

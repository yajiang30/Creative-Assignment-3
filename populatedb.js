// populatedb.js

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'your_database_file.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );
    `);

    // Sample data - From ChatGPT
    const users = [
        { username: 'FruitThinker', hashedGoogleId: 'hashedGoogleId1', avatar_url: '', memberSince: '2024-01-01 08:00:00' },
        { username: 'SkyTalker', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-01-02 09:00:00' },
        { username: 'TropicalThoughts', hashedGoogleId: 'hashedGoogleId3', avatar_url: '', memberSince: '2024-01-03 07:00:00' },
        { username: 'SockMystery', hashedGoogleId: 'hashedGoogleId4', avatar_url: '', memberSince: '2024-01-04 10:00:00' },
        { username: 'SynesthesiaSeeker', hashedGoogleId: 'hashedGoogleId5', avatar_url: '', memberSince: '2024-01-05 11:00:00' },
        { username: 'CatConspirator', hashedGoogleId: 'hashedGoogleId6', avatar_url: '', memberSince: '2024-01-06 12:00:00' },
        { username: 'DanceDreamer', hashedGoogleId: 'hashedGoogleId7', avatar_url: '', memberSince: '2024-01-07 13:00:00' },
        { username: 'GravityGazer', hashedGoogleId: 'hashedGoogleId8', avatar_url: '', memberSince: '2024-01-08 14:00:00' },
        { username: 'GumGuru', hashedGoogleId: 'hashedGoogleId9', avatar_url: '', memberSince: '2024-01-09 15:00:00' },
        { username: 'SoupSpeaker', hashedGoogleId: 'hashedGoogleId10', avatar_url: '', memberSince: '2024-01-10 16:00:00' }
    ];

    const posts = [
        { title: 'Banana Philosophy', content: 'I was thinking about bananas and how they might be the key to happiness, but then I wondered if happiness is really just a state of mind and how different it is for everyone. Also, did you know bananas are berries?', username: 'FruitThinker', timestamp: '2024-02-01 10:00', likes: 0 },
        { title: 'Cloud Conversations', content: 'Clouds are fascinating. They look so fluffy but are just condensed water. Speaking of water, have you ever thought about how important it is in our lives? We can\’t survive without it, and yet we waste so much of it every day. It\’s crazy!', username: 'SkyTalker', timestamp: '2024-02-02 12:00', likes: 0 },
        { title: 'Infinite Pineapples', content: 'If I had infinite pineapples, I would never run out of snacks. But then, what if I got tired of pineapples? Would I start giving them away? Maybe I could start a pineapple business. It\’s interesting how businesses start from small ideas like this.', username: 'TropicalThoughts', timestamp: '2024-02-03 08:30', likes: 0 },
        { title: 'The Great Sock Debate', content: 'Why do socks go missing all the time? It\’s like there\’s a black hole in the laundry machine. Speaking of black holes, did you hear about the latest discovery in space? They found a black hole that\’s billions of times more massive than the sun. Space is so mysterious.', username: 'SockMystery', timestamp: '2024-02-04 14:15', likes: 0 },
        { title: 'Color of Sound', content: 'I was thinking about what color sound would be if we could see it. Maybe it\’s blue because it\’s calming, but then I thought, what if it changes colors based on the type of sound? Like music would be colorful but noise would be gray. It\’s such a weird thing to think about.', username: 'SynesthesiaSeeker', timestamp: '2024-02-05 07:45', likes: 0 },
        { title: 'Invisible Cats', content: 'Imagine if there were invisible cats in our homes. We\’d never know they were there, but they\’d be knocking things over and making messes. Speaking of messes, I really need to clean my room. It\’s amazing how quickly things get messy.', username: 'CatConspirator', timestamp: '2024-02-06 16:20', likes: 0 },
        { title: 'Dancing Shoes', content: 'What if shoes could dance on their own? That would be hilarious to watch. Speaking of dancing, have you ever tried ballroom dancing? It\’s so elegant and fun. I once took a class, and it was a great workout too.', username: 'DanceDreamer', timestamp: '2024-02-07 11:00', likes: 0 },
        { title: 'Upside Down World', content: 'If gravity worked the opposite way, we\’d all be walking on ceilings. That would be so strange, but then again, we\’d probably get used to it. It\’s funny how adaptable humans are to different situations.', username: 'GravityGazer', timestamp: '2024-02-08 09:30', likes: 0 },
        { title: 'Bubblegum Universe', content: 'Imagine a universe made entirely of bubblegum. Everything would be chewy and sticky. I wonder if you could blow a bubble with the universe? That would be the biggest bubble ever. It\’s such a silly idea, but fun to think about.', username: 'GumGuru', timestamp: '2024-02-09 06:00', likes: 0 },
        { title: 'Alphabet Soup Language', content: 'What if we created a new language using only letters from alphabet soup? It would be so random and funny. Speaking of languages, it\’s amazing how many languages there are in the world, and how they all developed differently.', username: 'SoupSpeaker', timestamp: '2024-02-10 19:00', likes: 0 }
    ];

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});
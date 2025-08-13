import { useState } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);

  const handleSubmit = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/recommend', {
        userPrompt: input
      });
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>📚 AI Book Recommendation</h2>
      <input
        type="text"
        placeholder="e.g. I liked The Alchemist"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ padding: '8px', width: '300px', marginRight: '10px' }}
      />
      <button onClick={handleSubmit} style={{ padding: '8px 12px' }}>Ask AI</button>

      <div style={{ marginTop: '20px' }}>
        {recommendations.length > 0 ? (
          recommendations.map((book, index) => (
            <div key={index} style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px'
            }}>
              <h3>{book.title}</h3>
              <p><strong>Author:</strong> {book.author}</p>
              <p><strong>Genre:</strong> {book.genre}</p>
              <p>{book.description}</p>
            </div>
          ))
        ) : (
          <p>No recommendations yet.</p>
        )}
      </div>
    </div>
  );
}

export default App;

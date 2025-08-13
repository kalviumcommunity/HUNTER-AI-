import { useState } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const handleSubmit = async () => {
    const res = await axios.post('http://localhost:5000/api/recommend', {
      userPrompt: input
    });
    setRecommendation(res.data.result);
  };

  return (
    <div>
      <h2>Book Recommendation (Zero-Shot)</h2>
      <input
        type="text"
        placeholder="e.g. I liked The Alchemist"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button onClick={handleSubmit}>Ask AI</button>
      <div>{recommendation}</div>
    </div>
  );
}

export default App;

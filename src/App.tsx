import { AuthProvider } from './contexts/AuthContext';
import Navigation from './navigation';

function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

export default App;

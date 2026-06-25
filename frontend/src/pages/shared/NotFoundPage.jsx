import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-gray-600 mt-2 mb-6">Page not found</p>
      <Link to="/" className="text-blue-600 hover:underline text-sm">Go back home</Link>
    </div>
  </div>
);

export default NotFoundPage;

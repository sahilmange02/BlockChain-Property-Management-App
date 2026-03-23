import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-white">Blockchain Land Registry</h1>
      <p className="text-gray-400 mt-3">
        Register properties, store documents on Pinata IPFS, and manage ownership verification.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/properties" className="btn-primary text-center">
          Explore Properties
        </Link>
        <Link to="/login" className="btn-secondary text-center">
          Login
        </Link>
      </div>
    </div>
  );
}


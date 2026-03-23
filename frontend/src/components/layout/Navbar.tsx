import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWeb3 } from "../../context/Web3Context";
import WalletConnectButton from "../common/WalletConnectButton";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isConnected } = useWeb3();

  const role = user?.role;

  return (
    <header className="bg-gray-950/60 backdrop-blur border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-bold text-white hover:underline">
            Land Registry
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link to="/" className="text-gray-300 hover:text-white">
              Home
            </Link>
            <Link to="/properties" className="text-gray-300 hover:text-white">
              Properties
            </Link>
            {role === "CITIZEN" ? (
              <Link to="/dashboard" className="text-gray-300 hover:text-white">
                Dashboard
              </Link>
            ) : null}
            {role === "GOVERNMENT" ? (
              <Link to="/government" className="text-gray-300 hover:text-white">
                Government
              </Link>
            ) : null}
            {role === "ADMIN" ? (
              <Link to="/admin" className="text-gray-300 hover:text-white">
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <div className="hidden md:flex items-center gap-3 text-sm">
              <Link to="/login" className="text-indigo-400 hover:underline">
                Login
              </Link>
              <Link to="/register" className="text-indigo-400 hover:underline">
                Register
              </Link>
            </div>
          ) : (
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="hidden md:inline-flex text-sm text-gray-300 hover:text-white"
            >
              Logout
            </button>
          )}

          <div>
            <WalletConnectButton />
          </div>

          {isConnected ? null : null}
        </div>
      </div>
    </header>
  );
}


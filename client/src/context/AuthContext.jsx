import { createContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Load from storage
	useEffect(() => {
		const storedToken = localStorage.getItem('tms_token');
		const storedUser = localStorage.getItem('tms_user');
		if (storedToken && storedUser) {
			setToken(storedToken);
			try {
				setUser(JSON.parse(storedUser));
			} catch (e) {
				localStorage.removeItem('tms_user');
			}
		}
		setLoading(false);
	}, []);

	const persist = (tokenValue, userValue) => {
		localStorage.setItem('tms_token', tokenValue);
		localStorage.setItem('tms_user', JSON.stringify(userValue));
		setToken(tokenValue);
		setUser(userValue);
	};

	const login = async (email, password) => {
		setError(null);
		const data = await authService.login(email, password);
		persist(data.token, data.user);
		return data.user;
	};

	const signup = async (payload) => {
		setError(null);
		const data = await authService.signup(payload);
		persist(data.token, data.user);
		return data.user;
	};

	const logout = () => {
		setUser(null);
		setToken(null);
		localStorage.removeItem('tms_token');
		localStorage.removeItem('tms_user');
	};

	const value = useMemo(
		() => ({ user, token, loading, error, login, signup, logout, setError }),
		[user, token, loading, error]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

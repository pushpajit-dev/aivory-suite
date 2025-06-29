import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDocs, updateDoc, collection, query, where, orderBy, addDoc, serverTimestamp, increment, writeBatch, deleteDoc } from 'firebase/firestore';

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBMjVYI7Y4q4uuJzHsohlucEH2CcZBru8k",
  authDomain: "aiapp-fb574.firebaseapp.com",
  projectId: "aiapp-fb574",
  storageBucket: "aiapp-fb574.appspot.com",
  messagingSenderId: "376238000912",
  appId: "1:376238000912:web:5be92d21336b26353ab395"
};

const AIVORY_API_KEY = '2aee11fbf2f0eff91b4a6b7f433ac6a7e04cb12ad6911aaf552eae2da13e9464e2895c9eb4951ce7208bbd0bf38b4008'; 

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Main App Component ---
export default function App() {
  const [adminUser, setAdminUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      if (!isAuthReady) setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, [isAuthReady]);
  
  useEffect(() => {
      document.documentElement.className = theme;
  }, [theme]);


  if (!isAuthReady) {
    return <div className="bg-gray-900 text-white flex items-center justify-center min-h-screen"><div className="text-xl">Loading Admin Dashboard...</div></div>;
  }
  
  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {adminUser ? <AdminDashboard user={adminUser} theme={theme} setTheme={setTheme}/> : <AdminLogin theme={theme} setTheme={setTheme} />}
    </div>
  );
}

// --- Admin Login Screen ---
function AdminLogin({ theme, setTheme }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('Failed to login. Please check your credentials.');
            console.error("Login Error: ", err);
        } finally {
            setLoading(false);
        }
    };

    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="absolute top-4 right-4">
                <ThemeToggleButton theme={theme} setTheme={setTheme} />
            </div>
            <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">Aivory/Suite</h1>
                <p className="text-center text-indigo-600 dark:text-indigo-400 mb-6 font-semibold">Admin Panel</p>
                {error && <p className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4 text-center">{error}</p>}
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">Admin Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white" required />
                    </div>
                    <div className="mb-1">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white" required />
                    </div>
                     <div className="text-right mb-4"><button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Forgot Password?</button></div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-300 disabled:bg-indigo-400">
                        {loading ? 'Signing In...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
        {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
      </>
    );
}

// --- Main Dashboard Component ---
function AdminDashboard({ user, theme, setTheme }) {
    const [activePage, setActivePage] = useState('Users');
    const pages = ['Users', 'Orders', 'Help Requests', 'Notifications', 'Settings'];

    const renderPage = () => {
        switch (activePage) {
            case 'Users': return <UsersPage />;
            case 'Orders': return <OrdersPage />;
            case 'Help Requests': return <HelpRequestsPage />;
            case 'Notifications': return <NotificationsPage />;
            case 'Settings': return <SettingsPage />;
            default: return <UsersPage />;
        }
    };
    
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            <aside className="w-64 bg-white dark:bg-gray-800 p-6 flex flex-col text-gray-900 dark:text-white">
                <h1 className="text-2xl font-bold mb-2">Aivory<span className="text-indigo-500 dark:text-indigo-400">/</span>Admin</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Signed in as {user.email}</p>
                <nav className="flex-grow">
                    {pages.map(page => (
                        <button key={page} onClick={() => setActivePage(page)} className={`w-full text-left mb-2 px-4 py-2 rounded-lg transition-colors duration-200 ${activePage === page ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                           {page}
                        </button>
                    ))}
                </nav>
                <button onClick={() => signOut(auth)} className="w-full mt-auto text-left px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors duration-200">
                    Sign Out
                </button>
            </aside>
            <div className="flex-1 flex flex-col">
                <header className="bg-white dark:bg-gray-800/50 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
                    <button onClick={() => window.location.reload()} className="bg-gray-200 dark:bg-gray-700 text-sm py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Reset</button>
                    <ThemeToggleButton theme={theme} setTheme={setTheme} />
                </header>
                <main className="flex-1 p-8 overflow-y-auto">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
}

// --- Page Components ---
function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCell, setEditingCell] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersCollection = collection(db, "users");
            const q = query(usersCollection, orderBy("createdAt", "desc"));
            const usersSnapshot = await getDocs(q);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
            alert("Failed to fetch users. Check Firestore permissions.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCellClick = (user, field) => {
        setEditingCell({ userId: user.id, field });
        setEditingValue(user[field] || '');
    };
    
    const handleSaveEdit = async (e) => {
        if (e.key && e.key !== 'Enter' && e.key !== 'Escape') return;
        if (e.key === 'Escape') {
            setEditingCell(null);
            return;
        }
        if (!editingCell) return;
        
        const { userId, field } = editingCell;
        const userRef = doc(db, "users", userId);
        
        const valueToSave = parseInt(editingValue, 10);
        if (isNaN(valueToSave)) {
            alert("Please enter a valid number for credits.");
            return;
        }
        
        try {
            await updateDoc(userRef, { [field]: valueToSave });
            setEditingCell(null);
            setEditingValue('');
            fetchUsers();
        } catch (error) {
            console.error("Error updating cell:", error);
            alert("Failed to save changes.");
        }
    };
    
    const handleToggleActive = async (user) => {
        const userRef = doc(db, "users", user.id);
        try {
            await updateDoc(userRef, { isActive: !user.isActive });
            fetchUsers();
        } catch(err) {
            alert("Failed to update user status.");
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">User Management</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold">Email</th>
                            <th className="p-3 text-left text-sm font-semibold">Credits</th>
                            <th className="p-3 text-left text-sm font-semibold">Joined</th>
                            <th className="p-3 text-left text-sm font-semibold">Email Verified</th>
                            <th className="p-3 text-left text-sm font-semibold">Account Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-500 dark:text-gray-400">Loading users...</td></tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3">{user.email}</td>
                                <td className="p-3" onDoubleClick={() => handleCellClick(user, 'credits')}>
                                    {editingCell?.userId === user.id && editingCell?.field === 'credits' ? (
                                        <input type="number" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onBlur={handleSaveEdit} onKeyDown={handleSaveEdit} autoFocus className="bg-gray-200 dark:bg-gray-600 w-20 p-1 rounded"/>
                                    ) : (
                                        <span className="cursor-pointer">{user.credits}</span>
                                    )}
                                </td>
                                <td className="p-3">{user.createdAt?.toDate().toLocaleDateString()}</td>
                                <td className="p-3">{user.emailVerified ? <span className="text-green-500">Yes</span> : 'No'}</td>
                                <td className="p-3">
                                    <button onClick={() => handleToggleActive(user)} className={`text-xs py-1 px-3 rounded-full ${user.isActive ? 'bg-green-100 dark:bg-green-500/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-500/30 text-red-800 dark:text-red-300'}`}>
                                        {user.isActive ? 'Active' : 'Deactivated'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [editingCell, setEditingCell] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const ordersList = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setOrders(ordersList);
        setLoading(false);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    
    const handleStatusUpdate = async (order, newStatus) => {
        const orderRef = doc(db, "orders", order.id);
        const userRef = doc(db, "users", order.userId);
        try {
            await updateDoc(orderRef, { status: newStatus });
            if (newStatus === 'Verified' && typeof order.credits === 'number' && order.credits > 0) {
                 await updateDoc(userRef, { credits: increment(order.credits) });
            }
            fetchOrders();
        } catch (error) {
            console.error(`Error updating order ${order.id} to ${newStatus}:`, error);
            alert(`Failed to update order status.`);
        }
    };

    const handleCellClick = (order, field) => {
        setEditingCell({ orderId: order.id, field });
        setEditingValue(order[field] || '');
    };
    
    const handleSaveEdit = async (e) => {
        if (e.key && e.key !== 'Enter' && e.key !== 'Escape') return;
        if (e.key === 'Escape') {
            setEditingCell(null);
            return;
        }
        if (!editingCell) return;
        
        const { orderId, field } = editingCell;
        const orderRef = doc(db, "orders", orderId);
        
        let valueToSave = editingValue;
        if (field === 'credits') {
            valueToSave = parseInt(editingValue, 10);
            if (isNaN(valueToSave)) {
                alert("Please enter a valid number for credits.");
                return;
            }
        }
        
        try {
            await updateDoc(orderRef, { [field]: valueToSave });
            setEditingCell(null);
            setEditingValue('');
            fetchOrders();
        } catch (error) {
            console.error("Error updating cell:", error);
            alert("Failed to save changes.");
        }
    };

    const handleSelectRow = (orderId) => {
        setSelectedOrders(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedOrders(orders.map(o => o.id));
        } else {
            setSelectedOrders([]);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedOrders.length === 0) return;
        // eslint-disable-next-line no-restricted-globals
        if (confirm(`Are you sure you want to delete ${selectedOrders.length} order(s)? This action cannot be undone.`)) {
            const batch = writeBatch(db);
            selectedOrders.forEach(id => {
                batch.delete(doc(db, "orders", id));
            });
            await batch.commit();
            fetchOrders();
            setSelectedOrders([]);
        }
    };

    return (
         <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Orders</h2>
                <div className="flex items-center gap-2">
                     <button onClick={() => fetchOrders()} className="bg-gray-200 dark:bg-gray-700 text-sm py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Reset</button>
                     <button onClick={() => alert("Restore action triggered!")} className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded-lg">Restore</button>
                 </div>
            </div>
             {selectedOrders.length > 0 && (
                <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mb-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">{selectedOrders.length} selected</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => alert("Activate User(s) action triggered!")} className="bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-3 rounded-lg">Activate User</button>
                        <button onClick={() => alert("Deactivate User(s) action triggered!")} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs py-1 px-3 rounded-lg">Deactivate User</button>
                        <button onClick={() => alert("Block User(s) action triggered!")} className="bg-orange-600 hover:bg-orange-700 text-white text-xs py-1 px-3 rounded-lg">Block User</button>
                        <button onClick={handleDeleteSelected} className="bg-red-700 hover:bg-red-800 text-white text-xs py-1 px-3 rounded-lg">Delete</button>
                    </div>
                </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
                 <table className="w-full min-w-[1200px]">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 w-12"><input type="checkbox" onChange={handleSelectAll} checked={selectedOrders.length === orders.length && orders.length > 0} className="bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-indigo-500"/></th>
                            <th className="p-3 text-left text-sm font-semibold">Date</th>
                            <th className="p-3 text-left text-sm font-semibold">User Email</th>
                            <th className="p-3 text-left text-sm font-semibold">Amount</th>
                            <th className="p-3 text-left text-sm font-semibold">Credits</th>
                            <th className="p-3 text-left text-sm font-semibold">Status</th>
                            <th className="p-3 text-left text-sm font-semibold">Invoice Link</th>
                            <th className="p-3 text-left text-sm font-semibold">Proof</th>
                            <th className="p-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                     <tbody>
                        {loading ? (
                            <tr><td colSpan="9" className="p-4 text-center text-gray-500 dark:text-gray-400">Loading orders...</td></tr>
                        ) : orders.map(order => (
                             <tr key={order.id} className={`border-b border-gray-200 dark:border-gray-700 ${selectedOrders.includes(order.id) ? 'bg-indigo-50 dark:bg-indigo-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                 <td className="p-3"><input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelectRow(order.id)} className="bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-indigo-500"/></td>
                                 <td className="p-3 text-sm">{order.date?.toDate().toLocaleString()}</td>
                                 <td className="p-3 text-sm">{order.userEmail}</td>
                                 <td className="p-3 text-sm">₹{order.amount}</td>
                                 <td className="p-3 text-sm" onDoubleClick={() => handleCellClick(order, 'credits')}>
                                    {editingCell?.orderId === order.id && editingCell?.field === 'credits' ? (
                                        <input type="number" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onBlur={handleSaveEdit} onKeyDown={handleSaveEdit} autoFocus className="bg-gray-200 dark:bg-gray-600 w-20 p-1 rounded"/>
                                    ) : (
                                        <span className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 py-1 px-2 rounded-full text-xs cursor-pointer">{order.credits}</span>
                                    )}
                                </td>
                                <td className="p-3 text-sm"><span className={`py-1 px-2 rounded-full text-xs font-semibold ${
                                    order.status === 'Verified' ? 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300' :
                                    order.status === 'Rejected' ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300' :
                                    'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300'
                                }`}>{order.status}</span></td>
                                <td className="p-3 text-sm" onDoubleClick={() => handleCellClick(order, 'invoiceLink')}>
                                    {editingCell?.orderId === order.id && editingCell?.field === 'invoiceLink' ? (
                                        <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onBlur={handleSaveEdit} onKeyDown={handleSaveEdit} autoFocus className="bg-gray-200 dark:bg-gray-600 w-full p-1 rounded"/>
                                    ) : (
                                        <a href={order.invoiceLink || '#'} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{order.invoiceLink ? 'View Link' : 'Add Link'}</a>
                                    )}
                                </td>
                                 <td className="p-3 text-sm"><a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">View Proof</a></td>
                                 <td className="p-3 space-x-2">
                                     <button onClick={() => handleStatusUpdate(order, 'Verified')} className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded">Approve</button>
                                     <button onClick={() => handleStatusUpdate(order, 'Rejected')} className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded">Reject</button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
            </div>
         </div>
    );
}

function HelpRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const requestsRef = collection(db, "helpRequests");
        const q = query(requestsRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const requestsList = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setRequests(requestsList);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return (
         <div>
            <h2 className="text-3xl font-bold mb-6">Help Requests</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                 <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold">Date</th>
                            <th className="p-3 text-left text-sm font-semibold">User Email</th>
                            <th className="p-3 text-left text-sm font-semibold">Description</th>
                            <th className="p-3 text-left text-sm font-semibold">Attachment</th>
                        </tr>
                    </thead>
                     <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="p-4 text-center text-gray-500 dark:text-gray-400">Loading requests...</td></tr>
                        ) : requests.map(req => (
                             <tr key={req.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                 <td className="p-3 text-sm">{req.date?.toDate().toLocaleString()}</td>
                                 <td className="p-3 text-sm">{req.userEmail}</td>
                                 <td className="p-3 max-w-sm truncate">{req.description}</td>
                                 <td className="p-3 text-sm">{req.attachmentUrl && req.attachmentUrl !== 'None' ? <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">View</a> : 'None'}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
            </div>
         </div>
    );
}

function NotificationsPage() {
    const [email, setEmail] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('INFO');
    const [sentNotifications, setSentNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingNotif, setEditingNotif] = useState(null);

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        const notificationsRef = collection(db, "notifications");
        const q = query(notificationsRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const notifsList = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setSentNotifications(notifsList);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    const handleEditClick = (notif) => {
        setEditingNotif(notif);
        setEmail(notif.userEmail);
        setTitle(notif.title);
        setDescription(notif.description);
        setStatus(notif.status);
    };

    const handleCancelEdit = () => {
        setEditingNotif(null);
        setEmail('');
        setTitle('');
        setDescription('');
        setStatus('INFO');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !title || !description || !status) {
            setError('All fields are required.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            if (editingNotif) {
                const notifRef = doc(db, "notifications", editingNotif.id);
                await updateDoc(notifRef, {
                    userEmail: email,
                    title: title,
                    description: description,
                    status: status,
                    date: serverTimestamp()
                });
                setSuccess(`Notification to ${email} updated!`);
            } else {
                await addDoc(collection(db, "notifications"), {
                    userEmail: email,
                    title: title,
                    description: description,
                    status: status,
                    read: false,
                    date: serverTimestamp()
                });
                setSuccess(`Notification sent to ${email}!`);
            }
            handleCancelEdit();
            fetchNotifications();
        } catch (err) {
            setError('Failed to send notification.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">{editingNotif ? 'Edit Notification' : 'Send a Notification'}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">User Email (Required)</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" required />
                    </div>
                    <div>
                        <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Title (Required)</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" required />
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description (Required)</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" required />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Status (Required)</label>
                        <select id="status" value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500">
                            <option>INFO</option>
                            <option>SOLVED</option>
                            <option>ERROR</option>
                            <option>QUESTION</option>
                        </select>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-500 text-sm">{success}</p>}
                    <div className="flex gap-4">
                        <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-indigo-400">
                            {isSubmitting ? 'Sending...' : (editingNotif ? 'Update & Resend' : 'Send Notification')}
                        </button>
                        {editingNotif && (
                            <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors">
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <h2 className="text-3xl font-bold mb-6">Sent Notifications</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-auto max-h-96">
                <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold">Date</th>
                            <th className="p-3 text-left text-sm font-semibold">User Email</th>
                            <th className="p-3 text-left text-sm font-semibold">Title</th>
                            <th className="p-3 text-left text-sm font-semibold">Status</th>
                            <th className="p-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
                        ) : sentNotifications.map(notif => (
                            <tr key={notif.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm">{notif.date?.toDate().toLocaleString()}</td>
                                <td className="p-3 text-sm">{notif.userEmail}</td>
                                <td className="p-3 text-sm">{notif.title}</td>
                                <td className="p-3 text-sm"><span className={`py-1 px-2 rounded-full text-xs ${
                                    notif.status === 'INFO' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300' :
                                    notif.status === 'SOLVED' ? 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300' :
                                    notif.status === 'ERROR' ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300' :
                                    'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300'
                                }`}>{notif.status}</span></td>
                                <td className="p-3 space-x-2">
                                     <button onClick={() => handleEditClick(notif)} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-xs py-1 px-2 rounded">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SettingsPage() {
    const [showKeys, setShowKeys] = useState(false);
    
    const handleViewClick = async () => {
        const password = prompt("Please enter your admin password to view credentials:");
        if (password) {
            try {
                const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
                await reauthenticateWithCredential(auth.currentUser, credential);
                setShowKeys(true);
            } catch (error) {
                alert("Incorrect password. Please try again.");
                console.error("Reauthentication failed:", error);
            }
        }
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Settings</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">API Keys & URLs</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400">Aivory API Key</label>
                        <p className={`font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 text-sm overflow-x-auto ${!showKeys && 'blur-sm select-none'}`}>
                            {showKeys ? AIVORY_API_KEY : '****************************************************************'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400">Firebase Config</label>
                        <pre className={`font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 text-xs overflow-x-auto ${!showKeys && 'blur-sm select-none'}`}>
                            {showKeys ? JSON.stringify(firebaseConfig, null, 2) : '************************************************\n************************************************\n************************************************'}
                        </pre>
                    </div>
                    <div className="pt-4">
                        {showKeys ? (
                            <button onClick={() => setShowKeys(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">Hide Credentials</button>
                        ) : (
                            <button onClick={handleViewClick} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors">View Credentials</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
            <h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>
            {message ? (
                <p className="text-green-500 text-center">{message}</p>
            ) : (
                <>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Enter your email to receive a reset link.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <div>
                            <label htmlFor="reset-email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                            <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-lg">
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                </>
            )}
        </div>
    </div>
  );
}

function ThemeToggleButton({ theme, setTheme }) {
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  return (
    <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

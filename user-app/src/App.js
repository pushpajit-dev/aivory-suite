import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { getStorage } from "firebase/storage";

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBMjVYI7Y4q4uuJzHsohlucEH2CcZBru8k",
  authDomain: "aiapp-fb574.firebaseapp.com",
  projectId: "aiapp-fb574",
  storageBucket: "aiapp-fb574.appspot.com",
  messagingSenderId: "376238000912",
  appId: "1:376238000912:web:5be92d21336b26353ab395"
};

const CLIPDROP_API_KEY = process.env.REACT_APP_CLIPDROP_API_KEY; 
const QR_CODE_URL = 'https://i.ibb.co/hF1ZZSsF/qr-code.jpg';

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Tool Definitions & Guides ---
const tools = {
  removeBackground: { name: 'Remove Background', endpoint: 'https://clipdrop-api.co/remove-background/v1', inputs: ['image'], description: 'Automatically remove the background from any image.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload the image you want to remove the background from.', color: '#818cf8' }, { selector: '#generate-button', text: 'Step 2: Click Generate! The background will be removed automatically.', color: '#818cf8' }] } },
  cleanup: { name: 'Cleanup', endpoint: 'https://clipdrop-api.co/cleanup/v1', inputs: ['image', 'mask', 'cleanup_options'], description: 'Remove unwanted objects, defects, or people.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload your original image.', color: '#60a5fa' }, { selector: '#mask-upload', text: 'Step 2: Upload a black and white mask file. The white areas are what you want to remove.', color: '#60a5fa' }, { selector: '#cleanup-options', text: 'Step 3: Choose your desired processing quality.', color: '#60a5fa' }, { selector: '#generate-button', text: 'Step 4: Click Generate to clean up the image.', color: '#60a5fa' }] } },
  replaceBackground: { name: 'Replace Background', endpoint: 'https://clipdrop-api.co/replace-background/v1', inputs: ['image', 'prompt'], description: 'Teleport your subject anywhere with an AI-generated background.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload the image of your subject.', color: '#f472b6' }, { selector: '#prompt-input', text: 'Step 2: Describe the new background you want to create. This is optional!', color: '#f472b6' }, { selector: '#generate-button', text: 'Step 3: Click Generate to replace the background.', color: '#f472b6' }] } },
  removeText: { name: 'Remove Text', endpoint: 'https://clipdrop-api.co/remove-text/v1', inputs: ['image'], description: 'Erase any text from an image.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload an image that contains text.', color: '#fb923c' }, { selector: '#generate-button', text: 'Step 2: Click Generate. The AI will automatically find and remove the text.', color: '#fb923c' }] } },
  reimagine: { name: 'Reimagine', endpoint: 'https://clipdrop-api.co/reimagine/v1/reimagine', inputs: ['image'], description: 'Generate multiple variations of an image with AI.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload an image to get variations of.', color: '#a78bfa' }, { selector: '#generate-button', text: 'Step 2: Click Generate to see what the AI reimagines!', color: '#a78bfa' }] } },
  upscaling: { name: 'Image Upscaling', endpoint: 'https://clipdrop-api.co/image-upscaling/v1/upscale', inputs: ['image', 'upscaling_options'], description: 'Enlarge your images up to 4096x4096 while removing noise.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload the image you want to enlarge.', color: '#34d399' }, { selector: '#upscaling-options', text: 'Step 2: Enter your desired new width and height in pixels.', color: '#34d399' }, { selector: '#generate-button', text: 'Step 3: Click Generate to upscale the image.', color: '#34d399' }] } },
  uncrop: { name: 'Uncrop', endpoint: 'https://clipdrop-api.co/uncrop/v1', inputs: ['image', 'uncrop_options'], description: 'Change the aspect ratio of any image by extending its background.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload your image.', color: '#2dd4bf' }, { selector: '#uncrop-options', text: 'Step 2: Enter how many pixels you want to add to each side.', color: '#2dd4bf' }, { selector: '#generate-button', text: 'Step 3: Click Generate to uncrop the image.', color: '#2dd4bf' }] } },
  productPhotography: { name: 'Product Photography', endpoint: 'https://clipdrop-api.co/product-photography/v1', inputs: ['image', 'photography_options'], description: 'Create professional-looking product photos with custom backgrounds.', guide: { steps: [{ selector: '#image-upload', text: 'Step 1: Upload an image of your product.', color: '#f87171' }, { selector: '#photography-options', text: 'Step 2: Adjust the background color, lighting, and shadows to your liking.', color: '#f87171' }, { selector: '#generate-button', text: 'Step 3: Click Generate to create a studio-quality photo.', color: '#f87171' }] } },
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTool, setActiveTool] = useState('removeBackground');
  const [view, setView] = useState('login'); 
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    let unsubscribeFirestore = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeFirestore();
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => setUserData(docSnap.exists() ? docSnap.data() : null));
        setView('app');
      } else {
        setUser(null); setUserData(null); setView('login');
      }
      if (!isAuthReady) setIsAuthReady(true);
    });
    return () => { unsubscribeAuth(); unsubscribeFirestore(); };
  }, [isAuthReady]);

  useEffect(() => {
      document.documentElement.className = theme;
  }, [theme]);

  if (!isAuthReady) {
    return <div className="bg-gray-900 text-white flex items-center justify-center min-h-screen"><div className="text-xl">Loading Aivory Suite...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-white transition-colors duration-300">
      {view === 'app' && user ? <MainApp user={user} userData={userData} setActiveTool={setActiveTool} activeTool={activeTool} /> : <AuthScreen view={view} setView={setView} theme={theme} setTheme={setTheme} />}
    </div>
  );
}

// --- Authentication Screen ---
function AuthScreen({ view, setView, theme, setTheme }) {
    const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleSignUp = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { const uc = await createUserWithEmailAndPassword(auth, email, password); await setDoc(doc(db, "users", uc.user.uid), { email: uc.user.email, credits: 10, createdAt: new Date(), isActive: true }); } catch (err) { setError(err.message); } finally { setLoading(false); } };
    const handleLogin = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError(err.message); } finally { setLoading(false); } };
    
    const formTitle = view === 'login' ? 'Welcome Back' : 'Create Account'; const btnTxt = view === 'login' ? 'Login' : 'Sign Up'; const switchTxt = view === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"; const handleSubmit = view === 'login' ? handleLogin : handleSignUp;
    
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300">
            <div className="absolute top-4 right-4">
                <ThemeToggleButton theme={theme} setTheme={setTheme} />
            </div>
            <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">{formTitle}</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">to the Aivory Suite</p>
                {error && <p className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4 text-center">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white" required />
                    </div>
                    <div className="mb-1">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white" required />
                    </div>
                     <div className="text-right mb-4"><button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Forgot Password?</button></div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-300 disabled:bg-indigo-400">{loading ? 'Processing...' : btnTxt}</button>
                </form>
                <div className="text-center mt-6">
                    <button onClick={() => setView(view === 'login' ? 'signup' : 'login')} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-semibold">{switchTxt}</button>
                </div>
            </div>
        </div>
        {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
      </>
    );
}

// --- Main Application UI ---
function MainApp({ user, userData, activeTool, setActiveTool }) {
  const [imageFile, setImageFile] = useState(null); const [maskFile, setMaskFile] = useState(null); const [prompt, setPrompt] = useState(''); const [resultImage, setResultImage] = useState(null); const [isLoading, setIsLoading] = useState(false); const [error, setError] = useState('');
  const [showRechargeModal, setShowRechargeModal] = useState(false); const [rechargeAmount, setRechargeAmount] = useState('');
  const [showOrdersModal, setShowOrdersModal] = useState(false); const [showAboutModal, setShowAboutModal] = useState(false); const [showTiersModal, setShowTiersModal] = useState(false); const [showHelpModal, setShowHelpModal] = useState(false); const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false); const [notifications, setNotifications] = useState([]); const [hasUnread, setHasUnread] = useState(false);
  const [upscalingOptions, setUpscalingOptions] = useState({ width: '', height: '' });
  const [photographyOptions, setPhotographyOptions] = useState({ background_color_choice: '#ffffff', light_theta: 20, light_phi: 0, light_size: 1.7, shadow_darkness: 0.7 });
  const [uncropOptions, setUncropOptions] = useState({ extend_left: 0, extend_right: 0, extend_up: 0, extend_down: 0, seed: '' });
  const [cleanupMode, setCleanupMode] = useState('fast');
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  const currentTool = tools[activeTool];

  useEffect(() => { 
    const q = query(collection(db, "notifications"), where("userEmail", "==", user.email)); 
    const unsubscribe = onSnapshot(q, (querySnapshot) => { 
      const userNotifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
      userNotifications.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
      setNotifications(userNotifications); 
      if (userNotifications.some(n => !n.read)) { 
        setHasUnread(true); 
      } 
    }); 
    return () => unsubscribe(); 
  }, [user.email]);

  const resetState = useCallback(() => {
    setImageFile(null); setMaskFile(null); setPrompt(''); setResultImage(null); setError(''); setIsLoading(false);
    setPhotographyOptions({ background_color_choice: '#ffffff', light_theta: 20, light_phi: 0, light_size: 1.7, shadow_darkness: 0.7 });
    setUncropOptions({ extend_left: 0, extend_right: 0, extend_up: 0, extend_down: 0, seed: '' });
    setUpscalingOptions({ width: '', height: '' });
    setCleanupMode('fast');
  }, []);
  
  useEffect(() => { resetState(); }, [activeTool, resetState]);

  const showFloatingNotification = (message) => { setNotification({ show: true, message }); setTimeout(() => setNotification({ show: false, message: '' }), 4000); };
  const handleOpenRechargeFromTiers = (price) => { setRechargeAmount(price); setShowTiersModal(false); setShowRechargeModal(true); }
  
  const handleProcessImage = async () => {
    if (!userData) { setError('User data is still loading. Please try again in a moment.'); return; }
    if (!imageFile) { setError('Please upload an image file.'); return; }
    if(userData.credits <= 0) { setError('You are out of credits! Please recharge to continue.'); setShowRechargeModal(true); return; }
    if (CLIPDROP_API_KEY.includes('YOUR_CLIPDROP_API_KEY')) { setError('The application is not configured correctly. Missing API Key.'); return; }

    setIsLoading(true); setError(''); setResultImage(null);
    const formData = new FormData();
    formData.append('image_file', imageFile);

    if (currentTool.inputs.includes('mask')) { if (!maskFile) { setError('This tool requires a mask file.'); setIsLoading(false); return; } formData.append('mask_file', maskFile); }
    if (currentTool.inputs.includes('prompt')) { if (!prompt && activeTool !== 'replaceBackground') { setError('This tool requires a text prompt.'); setIsLoading(false); return; } formData.append('prompt', prompt); }
    if (currentTool.inputs.includes('upscaling_options')) { if (!upscalingOptions.width || !upscalingOptions.height) { setError('Target width and height are required.'); setIsLoading(false); return; } formData.append('target_width', upscalingOptions.width); formData.append('target_height', upscalingOptions.height); }
    if (currentTool.inputs.includes('cleanup_options')) { if (cleanupMode === 'quality') formData.append('mode', 'quality'); }
    if (currentTool.inputs.includes('photography_options')) { Object.entries(photographyOptions).forEach(([key, value]) => formData.append(key, key === 'background_color_choice' ? value.replace('#', '') : value.toString())); }
    if (currentTool.inputs.includes('uncrop_options')) { Object.entries(uncropOptions).forEach(([key, value]) => { if (value) formData.append(key, value); }); }
    
    try {
        const response = await fetch(currentTool.endpoint, { method: 'POST', headers: { 'x-api-key': CLIPDROP_API_KEY }, body: formData });
        if (!response.ok) { let errorText = `Error: ${response.status} ${response.statusText}`; try { const errorBody = await response.text(); errorText = errorBody || errorText; } catch(e) {} throw new Error(errorText); }
        const imageBlob = await response.blob();
        setResultImage(URL.createObjectURL(imageBlob));
        const newCredits = userData.credits - 1;
        await updateDoc(doc(db, "users", user.uid), { credits: newCredits });
    } catch (err) { setError(err.message || 'An unknown error occurred.'); } finally { setIsLoading(false); }
  };
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Tour tool={currentTool} isActive={isTourActive} onComplete={() => setIsTourActive(false)} />
      <aside className="w-64 bg-white dark:bg-gray-800 p-6 flex flex-col flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Aivory<span className="text-indigo-500">/</span>Suite</h1>
        <nav className="flex-grow">
          <ul>{Object.keys(tools).map(toolKey => <li key={toolKey} className="mb-2"><button onClick={() => setActiveTool(toolKey)} className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 ${activeTool === toolKey ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{tools[toolKey].name}</button></li>)}</ul>
        </nav>
        <div className="mt-auto">
           <button onClick={() => setShowTiersModal(true)} className="w-full flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 mb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><TiersIcon/>Tiers</button>
           <button onClick={() => setShowHelpModal(true)} className="w-full flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 mb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><HelpIcon/>Help</button>
           <button onClick={() => setShowAboutModal(true)} className="w-full flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 mb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><AboutIcon/>About</button>
           <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><SignOutIcon/>Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <div><h2 className="text-3xl font-bold">{currentTool.name}</h2><p className="text-gray-500 dark:text-gray-400 mt-1">{currentTool.description}</p></div>
          <div className="flex items-center gap-6">
            <div className="text-right"><div className="font-bold text-lg">{userData?.credits ?? 0} Credits</div><div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div></div>
            <div className="flex items-center gap-4">
                <button onClick={() => {setShowNotificationsModal(true); setHasUnread(false);}} title="Notifications" className="relative p-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 hover:text-white rounded-full transition-colors"><NotificationIcon />{hasUnread && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>}</button>
                <button onClick={() => setShowRechargeModal(true)} title="Recharge Credits" className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 hover:text-white rounded-full transition-colors"><RechargeIcon /></button>
                <button onClick={() => setShowOrdersModal(true)} title="Order History" className="relative p-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 hover:text-white rounded-full transition-colors"><OrdersIcon />{hasNewOrder && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>}</button>
            </div>
          </div>
        </header>

        {notification.show && <div className="absolute top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce">{notification.message}</div>}

        <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center">
            {error && <div className="w-full max-w-2xl bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 p-3 rounded-md mb-4 text-center whitespace-pre-wrap">{error}</div>}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="w-full flex flex-col gap-4">
                    <div className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300">New to this tool? <button onClick={() => setIsTourActive(true)} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Start the guided tour!</button></p>
                    </div>
                    <ImageUploader id="image-upload" label="Upload Image" onFileSelect={setImageFile} />
                    {currentTool.inputs.includes('mask') && <ImageUploader id="mask-upload" label="Upload Mask (PNG only)" onFileSelect={setMaskFile} />}
                    {currentTool.inputs.includes('prompt') && <div id="prompt-input"><label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Prompt {activeTool !== 'replaceBackground' && <span className="text-red-400">*</span>}</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows="3" className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" placeholder="e.g., A cozy marble kitchen"></textarea></div>}
                    {currentTool.inputs.includes('upscaling_options') && <UpscalingOptions id="upscaling-options" options={upscalingOptions} setOptions={setUpscalingOptions} />}
                    {currentTool.inputs.includes('cleanup_options') && <CleanupOptions id="cleanup-options" mode={cleanupMode} setMode={setCleanupMode} />}
                    {currentTool.inputs.includes('photography_options') && <PhotographyOptions id="photography-options" options={photographyOptions} setOptions={setPhotographyOptions} />}
                    {currentTool.inputs.includes('uncrop_options') && <UncropOptions id="uncrop-options" options={uncropOptions} setOptions={setUncropOptions} />}
                    <button id="generate-button" onClick={handleProcessImage} disabled={isLoading || !imageFile || !userData} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all text-lg">{isLoading ? 'Processing...' : `Generate (-1 Credit)`}</button>
                </div>
                <div className="w-full h-full bg-gray-200 dark:bg-gray-900 rounded-lg flex items-center justify-center p-4 min-h-[300px] lg:min-h-[400px] relative">{resultImage ? <><img src={resultImage} alt="Processed result" className="max-w-full max-h-full object-contain rounded-md"/><a href={resultImage} download={`result-${Date.now()}.png`} className="absolute bottom-4 right-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Download</a></> : <div className="text-center text-gray-500"><p>Your result will appear here</p></div>}</div>
            </div>
        </div>
      </main>
      {showTiersModal && <TiersModal onClose={() => setShowTiersModal(false)} onRechargeClick={handleOpenRechargeFromTiers} />}
      {showRechargeModal && <RechargeModal user={user} onClose={() => {setShowRechargeModal(false); setRechargeAmount('')}} showNotification={showFloatingNotification} setHasNewOrder={setHasNewOrder} initialAmount={rechargeAmount} onShowPolicy={() => setShowPolicyModal(true)} />}
      {showOrdersModal && <OrdersModal user={user} onClose={() => setShowOrdersModal(false)} />}
      {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
      {showHelpModal && <HelpModal user={user} onClose={() => setShowHelpModal(false)} showNotification={showFloatingNotification} />}
      {showNotificationsModal && <NotificationsModal notifications={notifications} onClose={() => setShowNotificationsModal(false)} />}
      {showPolicyModal && <PolicyModal onClose={() => setShowPolicyModal(false)} />}
    </div>
  );
}

// --- ICONS ---
const RechargeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const OrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const NotificationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const TiersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>;
const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AboutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SignOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

// --- ALL OTHER MODALS AND HELPER COMPONENTS ---
function NumberInput({ label, value, onChange, placeholder, min, max }) { return (<div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label><input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500"/></div>) }
function UpscalingOptions({ id, options, setOptions }) { const handleChange = (k, v) => { const n = parseInt(v, 10); if(isNaN(n) || n<1){setOptions(p=>({...p, [k]:''}));} else if(n>4096){setOptions(p=>({...p, [k]:4096}));} else{setOptions(p=>({...p, [k]:n}));} }; return (<div id={id} className="w-full space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50"><h4 className="font-semibold text-md mb-2">Upscaling Dimensions</h4><div className="grid grid-cols-2 gap-x-4 gap-y-3"><NumberInput label="Target Width (px)" value={options.width} onChange={v=>handleChange('width',v)} min="1" max="4096"/><NumberInput label="Target Height (px)" value={options.height} onChange={v=>handleChange('height',v)} min="1" max="4096"/></div></div>); }
function CleanupOptions({ id, mode, setMode }) { return (<div id={id} className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50"><h4 className="font-semibold text-md mb-2">Processing Mode</h4><div className="flex gap-2"><button onClick={()=>setMode('fast')} className={`flex-1 p-2 rounded-lg text-sm transition-colors ${mode==='fast'?'bg-indigo-600 text-white':'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>Fast</button><button onClick={()=>setMode('quality')} className={`flex-1 p-2 rounded-lg text-sm transition-colors ${mode==='quality'?'bg-indigo-600 text-white':'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>Quality</button></div></div>); }
function UncropOptions({ id, options, setOptions }) { const handleChange = (k,v) => {const n=parseInt(v,10); if(k!=='seed'){if(isNaN(n)||n<0){setOptions(p=>({...p,[k]:0}));}else if(n>2000){setOptions(p=>({...p,[k]:2000}));}else{setOptions(p=>({...p,[k]:n}));}}else{if(v===''||(n>=0&&n<=100000)){setOptions(p=>({...p,[k]:v}));}}}; return (<div id={id} className="w-full space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50"><h4 className="font-semibold text-md mb-2">Uncrop Options</h4><div className="grid grid-cols-2 gap-x-4 gap-y-3"><NumberInput label="Extend Left" value={options.extend_left} onChange={v=>handleChange('extend_left',v)} min="0" max="2000"/><NumberInput label="Extend Right" value={options.extend_right} onChange={v=>handleChange('extend_right',v)} min="0" max="2000"/><NumberInput label="Extend Up" value={options.extend_up} onChange={v=>handleChange('extend_up',v)} min="0" max="2000"/><NumberInput label="Extend Down" value={options.extend_down} onChange={v=>handleChange('extend_down',v)} min="0" max="2000"/></div><div className="pt-2"><NumberInput label="Seed (Optional, 0-100k)" value={options.seed} onChange={v=>handleChange('seed',v)} placeholder="e.g. 12345" min="0" max="100000"/></div></div>); }
function OptionSlider({ label, value, onChange, min, max, step }) { return (<div><div className="flex justify-between items-center mb-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label><span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{value}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"/></div>); }
function PhotographyOptions({ id, options, setOptions }) { const handleChange=(k,v)=>{setOptions(p=>({...p,[k]:v}));}; return (<div id={id} className="w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50"><h4 className="font-semibold text-md mb-2">Advanced Options</h4><div className="flex items-center gap-4"><label htmlFor="bg-color" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">BG Color</label><input id="bg-color" type="color" value={options.background_color_choice} onChange={e=>handleChange('background_color_choice',e.target.value)} className="w-10 h-10 p-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"/><input type="text" value={options.background_color_choice} onChange={e=>handleChange('background_color_choice',e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" maxLength="7"/></div><OptionSlider label="Light Angle" value={options.light_theta} onChange={v=>handleChange('light_theta',v)} min="0" max="45" step="1"/><OptionSlider label="Light Position" value={options.light_phi} onChange={v=>handleChange('light_phi',v)} min="0" max="359" step="1"/><OptionSlider label="Light Size" value={options.light_size} onChange={v=>handleChange('light_size',v)} min="1.0" max="8.0" step="0.1"/><OptionSlider label="Shadow Darkness" value={options.shadow_darkness} onChange={v=>handleChange('shadow_darkness',v)} min="0.5" max="2.0" step="0.1"/></div>); }
function ImageUploader({ id, label, onFileSelect }) { const [preview, setPreview] = useState(null); const fileInputRef = useRef(null); const handleFileChange = (e) => { const file = e.target.files[0]; if (file) { onFileSelect(file); const reader = new FileReader(); reader.onloadend = () => setPreview(reader.result); reader.readAsDataURL(file); } }; const handleDragOver = (e) => e.preventDefault(); const handleDrop = (e) => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } }); }; return (<div id={id} className="w-full p-4 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current.click()}><input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange}/>{preview ? <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-md" /> : <div className="text-gray-500 dark:text-gray-400"><p className="font-bold">{label}</p><p className="text-sm">Drag & drop or click to upload</p></div>}</div>); }
function TiersModal({ onClose, onRechargeClick }) { const tiers = [ { name: 'Basic', price: 30, credits: 16, popular: false }, { name: 'Standard', price: 90, credits: 56, popular: true }, { name: 'Premium', price: 150, credits: 80, popular: false }, ]; return (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-4xl relative"><button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button><h2 className="text-3xl font-bold text-center mb-2">Choose Your Plan</h2><p className="text-center text-gray-500 dark:text-gray-400 mb-8">Select the perfect credit bundle for your needs.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{tiers.map(tier => (<div key={tier.name} className={`relative p-8 rounded-xl border-2 transition-transform hover:scale-105 ${tier.popular ? 'border-indigo-500' : 'border-gray-700'}`}>{tier.popular && <div className="absolute top-0 right-6 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-b-lg">POPULAR</div>}<div className="text-center"><h3 className="text-xl font-semibold mb-2">{tier.name}</h3><p className="text-5xl font-bold mb-2">₹{tier.price}</p><p className="text-2xl font-bold text-green-500 dark:text-green-400 mb-4">{tier.credits} Credits</p><p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Approx. ₹{(tier.price / tier.credits).toFixed(2)} / credit</p><button onClick={() => onRechargeClick(tier.price)} className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${tier.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-indigo-600'}`}>Recharge Now</button></div></div>))}</div></div></div>); }
function RechargeModal({ user, onClose, showNotification, setHasNewOrder, initialAmount = '', onShowPolicy }) { const [amount, setAmount] = useState(initialAmount); const [credits, setCredits] = useState(0); const [proofUrl, setProofUrl] = useState(''); const [termsAccepted, setTermsAccepted] = useState(false); const [isSubmitting, setIsSubmitting] = useState(false); const [error, setError] = useState(''); useEffect(() => { setAmount(initialAmount); }, [initialAmount]); useEffect(() => { const numAmount = parseInt(amount, 10); setCredits(!isNaN(numAmount) && numAmount > 0 ? Math.floor(numAmount * (16 / 30)) : 0); }, [amount]); const handleSubmit=async(e)=>{e.preventDefault();if(!amount||!proofUrl||!termsAccepted){setError('Please fill all fields and accept the terms.');return;}setIsSubmitting(true);setError('');try{await addDoc(collection(db,"orders"),{userId:user.uid,userEmail:user.email,orderId:`ORD-${Date.now()}`,date:serverTimestamp(),amount:parseInt(amount,10),credits:credits,paymentProofUrl:proofUrl,status:'Pending'});showNotification('Your request has been submitted!');setHasNewOrder(true);onClose();}catch(err){console.error("Order submission error: ",err);setError('Failed to submit order. Please try again.');}finally{setIsSubmitting(false);}};return(<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-lg relative"><button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button><h2 className="text-2xl font-bold text-center mb-4">Submit Payment Proof</h2>{error && <p className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 p-2 rounded-md mb-4 text-sm text-center">{error}</p>}<form onSubmit={handleSubmit}><div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"><div className="space-y-4"><div className="p-4 bg-white rounded-lg"><img src={QR_CODE_URL} alt="Payment QR Code" className="w-full h-auto"/></div><p className="text-center text-lg font-sans font-semibold">UPI: <span className="font-mono text-indigo-600 dark:text-indigo-300">pushpojitroy@ybl</span></p></div><div className="space-y-4"><div className="text-center bg-gray-100 dark:bg-gray-900 p-3 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">You will receive</p><p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{credits} Credits</p></div><div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Enter Amount Paid (INR)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" placeholder="e.g., 30" required/></div><div><label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Payment Proof Image URL</label><input type="url" value={proofUrl} onChange={e=>setProofUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" placeholder="https://..." required/><div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload to <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">ImgBB</a> or <a href="https://beeimg.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">BeeIMG</a> & paste link.</div></div><div className="flex items-start space-x-3 pt-2"><input id="terms" type="checkbox" checked={termsAccepted} onChange={()=>setTermsAccepted(!termsAccepted)} className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-700 mt-0.5" required/><label htmlFor="terms" className="text-xs text-gray-500 dark:text-gray-400">I agree that if I submit fake documents, my account may be suspended. <button type="button" onClick={onShowPolicy} className="text-indigo-600 dark:text-indigo-400 hover:underline">View Refund Policy</button>.</label></div></div></div><button type="submit" disabled={isSubmitting||!amount||!proofUrl||!termsAccepted} className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300">{isSubmitting?'Submitting...':'Submit for Verification'}</button></form></div></div>); }
function OrdersModal({ user, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setLoading(true);
      try {
          const q = query(collection(db, "orders"), where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          let userOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          userOrders.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
          setOrders(userOrders);
      } catch (err) {
          console.error("Error fetching orders:", err)
      } finally {
          setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const getStatusClass = (s) => {
    switch (s) {
      case 'Verified': return 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300';
      case 'Pending': return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300';
      case 'Rejected': return 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-4xl relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button>
        <h2 className="text-2xl font-bold text-center mb-6">Your Order History</h2>
        <div className="overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">You have no orders yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-gray-50 dark:bg-gray-900/70 p-4 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-center text-sm">
                  <div><span className="font-bold text-gray-500 dark:text-gray-400 block md:hidden">Order ID:</span> {order.orderId}</div>
                  <div><span className="font-bold text-gray-500 dark:text-gray-400 block md:hidden">Date:</span> {new Date(order.date?.seconds * 1000).toLocaleDateString()}</div>
                  <div><span className="font-bold text-gray-500 dark:text-gray-400 block md:hidden">Amount:</span> ₹{order.amount}</div>
                  <div>
                    <span className="font-bold text-gray-500 dark:text-gray-400 block md:hidden">Credits:</span>
                    <span className={`py-1 px-2 rounded-full text-xs font-semibold ${getStatusClass(order.status)}`}>
                        {order.status === 'Verified' ? `+${order.credits}` : '...'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500 dark:text-gray-400 block md:hidden">Status:</span>
                    <span className={`py-1 px-2 rounded-full text-xs font-semibold ${getStatusClass(order.status)}`}>{order.status}</span>
                  </div>
                   <div className="md:col-span-5 mt-2 md:mt-0 text-center md:text-left">
                     {order.invoiceLink ? <a href={order.invoiceLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Download Invoice</a> : <span className="text-gray-500">No Invoice</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function AboutModal({ onClose }) { return (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md relative"><button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl">&times;</button><h2 className="text-2xl font-bold text-center mb-4">About</h2><div className="text-gray-600 dark:text-gray-300 space-y-4"><p>This suite of AI-powered image editing tools is designed to streamline your creative workflow.</p><p>We use cutting-edge APIs to provide high-quality results for background removal, object cleanup, image enhancement, and more.</p><p className="pt-4 font-semibold">Product by Aivory/</p></div></div></div>); }
function HelpModal({ user, onClose, showNotification }) { const [description, setDescription] = useState(''); const [attachmentUrl, setAttachmentUrl] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false); const [error, setError] = useState(''); const handleSubmit=async(e)=>{e.preventDefault();if(!description){setError('Please describe your issue.');return;}setIsSubmitting(true);setError('');try{await addDoc(collection(db,"helpRequests"),{userEmail:user.email,description:description,status:'New',attachmentUrl:attachmentUrl||'None',date:serverTimestamp()});showNotification('Your help request has been submitted!');onClose();}catch(err){console.error("Help request error:",err);setError("Failed to submit request. Please try again.");}finally{setIsSubmitting(false);}}; return(<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-lg relative"><button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button><h2 className="text-2xl font-bold text-center mb-4">Contact & Help</h2><p className="text-center text-gray-500 dark:text-gray-400 mb-6">Have a question or problem? Let us know.</p><form onSubmit={handleSubmit} className="space-y-4">{error&&<p className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 p-2 rounded-md text-sm text-center">{error}</p>}<div><label htmlFor="description" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Describe the problem</label><textarea id="description" value={description} onChange={e=>setDescription(e.target.value)} rows="5" className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" placeholder="Please be as detailed as possible..."></textarea></div><div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Attachment URL (optional)</label><input type="url" value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" placeholder="https://..." /><div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload to <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">ImgBB</a> or <a href="https://beeimg.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">BeeIMG</a> & paste link.</div></div><button type="submit" disabled={isSubmitting} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg">{isSubmitting?'Submitting...':'Submit Request'}</button></form></div></div>); }
function NotificationsModal({ notifications, onClose }) { const [selectedNotification, setSelectedNotification] = useState(null); const getStatusIcon = (status) => { switch (status) { case 'SOLVED': return <span className="text-green-400">✓</span>; case 'ERROR': return <span className="text-red-400">✗</span>; case 'INFO': return <span className="text-yellow-400">i</span>; case 'QUESTION': return <span className="text-blue-400">?</span>; default: return null; } }; return (<><div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-2xl relative max-h-[90vh] flex flex-col"><button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button><h2 className="text-2xl font-bold text-center mb-6">Notifications</h2><div className="overflow-y-auto space-y-3">{notifications.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400">You have no notifications.</p> : notifications.map(n => (<button key={n.id} onClick={() => setSelectedNotification(n)} className="w-full text-left p-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-4"><div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-lg ${n.status === 'SOLVED' ? 'bg-green-500/30' : n.status === 'ERROR' ? 'bg-red-500/30' : n.status === 'INFO' ? 'bg-yellow-500/30' : 'bg-blue-500/30'}`}>{getStatusIcon(n.status)}</div><div className="flex-grow"><p className="font-semibold">{n.title}</p></div><div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{new Date(n.date.seconds * 1000).toLocaleDateString()}</div></button>))}</div></div></div>{selectedNotification && <NotificationDetailModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />}</>); }
function NotificationDetailModal({ notification, onClose }) { const copyToClipboard = () => { navigator.clipboard.writeText(notification.description); }; return (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-xl relative"><h3 className="text-xl font-bold mb-2">{notification.title}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Received on {new Date(notification.date.seconds * 1000).toLocaleString()}</p><div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg max-h-64 overflow-y-auto whitespace-pre-wrap text-gray-600 dark:text-gray-300">{notification.description}</div><div className="flex justify-end gap-4 mt-6"><button onClick={copyToClipboard} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Copy</button><button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg">Close</button></div></div></div>); }
function PolicyModal({ onClose }) { return (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-2xl relative"><button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button><h2 className="text-2xl font-bold text-center mb-4">Refund & Account Policy</h2><div className="text-gray-600 dark:text-gray-300 space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-4"><p><strong className="text-gray-900 dark:text-white">Account Suspension:</strong> Your account will be suspended permanently if any fraudulent activity is detected, including but not limited to submitting fake payment documents or attempting to exploit the credit system. No refunds will be issued for suspended accounts.</p><p><strong className="text-gray-900 dark:text-white">Credit Updates:</strong> Credits are applied to your account only after our team has successfully verified your payment. This process is manual and may take some time. Please check your "Order History" for status updates.</p><p><strong className="text-gray-900 dark:text-white">Refunds:</strong> Refunds are only available in two specific scenarios:</p><ul className="list-disc list-inside space-y-2 pl-4"><li>If a payment is successfully made but credits are not applied within a reasonable timeframe due to a system error on our part.</li><li>If a core tool is non-functional or consistently produces failed results that are not attributable to user error (e.g., incorrect file format).</li></ul><p>Refunds are not available for credits that have already been used, or for dissatisfaction with the creative output of the AI, as results are subjective. For any issues, please use the "Help" form to contact support first.</p></div></div></div>); }
function Tour({ tool, isActive, onComplete }) { const [stepIndex, setStepIndex] = useState(0); const currentStep = isActive && tool.guide ? tool.guide.steps[stepIndex] : null; useEffect(() => { if (isActive) { setStepIndex(0); } }, [isActive, tool.name]); const handleNext = () => { if (stepIndex < tool.guide.steps.length - 1) { setStepIndex(stepIndex + 1); } else { onComplete(); } }; const handleEnd = () => { onComplete(); }; if (!isActive || !currentStep) return null; return <TourOverlay step={currentStep} onNext={handleNext} onEnd={handleEnd} stepNumber={stepIndex + 1} totalSteps={tool.guide.steps.length} />; }
function TourOverlay({ step, onNext, onEnd, stepNumber, totalSteps }) { const [position, setPosition] = useState(null); const [tooltipPos, setTooltipPos] = useState(null); useEffect(() => { const targetElement = document.querySelector(step.selector); if (targetElement) { const updatePosition = () => { const rect = targetElement.getBoundingClientRect(); setPosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, }); setTooltipPos({ top: rect.bottom + 12, left: rect.left }); targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }; updatePosition(); window.addEventListener('resize', updatePosition); return () => window.removeEventListener('resize', updatePosition); } }, [step]); if (!position) return null; return (<div className="fixed inset-0 z-[1000]"><div className="absolute inset-0" style={{ boxShadow: `0 0 0 9999px rgba(0,0,0,0.7)` }}></div><div className="absolute rounded-lg" style={{ ...position, boxShadow: `0 0 0 9999px rgba(0,0,0,0.7), 0 0 0 5px ${step.color}`, transition: 'all 0.3s ease-in-out' }}></div><div className="absolute bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ease-in-out" style={tooltipPos}><p className="mb-4 text-sm">{step.text}</p><div className="flex justify-between items-center"><span className="text-xs opacity-70">{stepNumber} / {totalSteps}</span><div><button onClick={onEnd} className="text-gray-400 hover:text-white text-sm font-semibold mr-4">End Tour</button><button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-4 rounded-md">{stepNumber === totalSteps ? 'Finish' : 'Next'}</button></div></div></div></div>); }
function ThemeToggleButton({ theme, setTheme }) { const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark'); return (<button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"> {theme === 'dark' ? '☀️' : '🌙'} </button>); }
function ForgotPasswordModal({ onClose }) { const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setMessage(''); setError(''); try { await sendPasswordResetEmail(auth, email); setMessage('Password reset email sent! Please check your inbox.'); } catch (err) { setError(err.message); } finally { setLoading(false); } }; return (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md relative"><button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">&times;</button><h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>{message ? <p className="text-green-500 text-center">{message}</p> : <><p className="text-center text-gray-500 dark:text-gray-400 mb-6">Enter your email to receive a reset link.</p><form onSubmit={handleSubmit} className="space-y-4">{error && <p className="text-red-400 text-sm text-center">{error}</p>}<div><label htmlFor="reset-email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email Address</label><input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-indigo-500" required /></div><button type="submit" disabled={loading} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-lg">{loading ? 'Sending...' : 'Send Reset Link'}</button></form></>}</div></div>); }

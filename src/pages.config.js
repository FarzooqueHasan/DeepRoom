import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import StudyRoom from './pages/StudyRoom';
import OAuthConsent from './pages/OAuthConsent';
import Layout from './Layout';

export const pagesConfig = {
  mainPage: 'Home',
  Pages: {
    Home,
    Leaderboard,
    Profile,
    StudyRoom,
    OAuthConsent,
  },
  Layout,
};

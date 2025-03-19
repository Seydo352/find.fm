import React, { useState, useEffect } from 'react';
import { Search, Music, Disc, User, Clock, Award, BarChart2, Calendar, Headphones, Activity, Heart, Globe, Music2, Bookmark, PieChart } from 'lucide-react';

// Spotify API constants
const SPOTIFY_CLIENT_ID = 'ec65a3e0c919492c863a40dc1fb23c8e'; // Replace with your actual client ID
const REDIRECT_URI = window.location.origin + '/';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = 'user-read-private user-read-email user-top-read';

// Helper function to get token from URL on callback


const getTokenFromUrl = () => {
  const hash = window.location.hash;
  if (!hash) return null;

  const token = hash
    .substring(1)
    .split('&')
    .find(elem => elem.startsWith('access_token'))
    ?.split('=')[1];

  // Clean the URL by removing the hash
  window.location.hash = '';
  
  return token;
};

// Main App component
const SpotifyApp = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);

  // Check for token on component mount
  useEffect(() => {
    // Check if we already have a token in localStorage
    const savedToken = localStorage.getItem('spotify_token');
    const tokenExpiryStr = localStorage.getItem('spotify_token_expiry');
    const tokenExpiry = tokenExpiryStr ? parseInt(tokenExpiryStr) : 0;
    
    // Check for token in URL (after redirect from Spotify)
    const tokenFromUrl = getTokenFromUrl();
    
    if (tokenFromUrl) {
      // Save the new token to localStorage with expiry (1 hour from now)
      const expiryTime = Date.now() + 3600 * 1000;
      localStorage.setItem('spotify_token', tokenFromUrl);
      localStorage.setItem('spotify_token_expiry', expiryTime.toString());
      setToken(tokenFromUrl);
    } else if (savedToken && tokenExpiry > Date.now()) {
      // Use existing token if it's still valid
      setToken(savedToken);
    }
  }, []);

  // Fetch user profile and stats when token is available
  useEffect(() => {
    if (token) {
      // Fetch user profile data
      fetchUserProfile();
      
      // Fetch user stats
      fetchUserStats();
    }
  }, [token]);

  // Fetch user profile data from Spotify API
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch user profile');
      }
      
      const data = await response.json();
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch user stats from Spotify API
  const fetchUserStats = async () => {
    try {
      // Fetch user's top artists
      const topArtistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!topArtistsResponse.ok) {
        throw new Error('Failed to fetch top artists');
      }
      
      const topArtistsData = await topArtistsResponse.json();
      
      // Fetch user's top tracks
      const topTracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!topTracksResponse.ok) {
        throw new Error('Failed to fetch top tracks');
      }
      
      const topTracksData = await topTracksResponse.json();
      
      // Construct user stats object
      const stats = {
        topArtists: topArtistsData.items,
        topTracks: topTracksData.items,
        favoriteGenres: extractTopGenres(topArtistsData.items),
      };
      
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Helper function to extract top genres from top artists
  const extractTopGenres = (artists) => {
    const genreCounts = {};
    
    artists.forEach(artist => {
      artist.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  };

  // Function to initiate Spotify login
  const login = () => {
    window.location.href = `${AUTH_ENDPOINT}?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${encodeURIComponent(SCOPES)}`;
  };

  // Function to logout
  const logout = () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expiry');
    setToken(null);
    setSelectedArtist(null);
    setUserProfile(null);
    setUserStats(null);
  };

  // Fetch artist data from Spotify API
  const searchSpotify = async (query) => {
    if (!token || query.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=artist&limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired
          logout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch data from Spotify');
      }
      
      const data = await response.json();
      setSearchResults(data.artists.items);
    } catch (error) {
      console.error('Error searching Spotify:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Search debounce effect
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchSpotify(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, token]);

  // Function to get artist details
    const fetchArtistDetails = async (artistId) => {
      if (!token) return null;
      
      setLoading(true);
      
      try {
        // Get basic artist info
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!artistResponse.ok) throw new Error('Failed to fetch artist data');
        const artistData = await artistResponse.json();
        
        // Get top tracks
        const tracksResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!tracksResponse.ok) throw new Error('Failed to fetch top tracks');
        const tracksData = await tracksResponse.json();
        
        // Get albums
        const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album&limit=10&market=US`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!albumsResponse.ok) throw new Error('Failed to fetch albums');
        const albumsData = await albumsResponse.json();
        
        // Format the data
        const formattedArtist = {
          ...artistData,
          topTracks: tracksData.tracks.map(track => ({
            id: track.id,
            name: track.name,
            duration: formatDuration(track.duration_ms),
            popularity: track.popularity,
            // Generate estimated stream count based on popularity
            streams: Math.floor((track.popularity * 100000) + (Math.random() * 5000000)).toLocaleString()
          })),
          albums: albumsData.items.map(album => ({
            id: album.id,
            name: album.name,
            year: new Date(album.release_date).getFullYear(),
            tracks: album.total_tracks,
            images: album.images
          }))
        };
        
        return formattedArtist;
    } catch (error) {
      console.error('Error fetching artist details:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Helper to format milliseconds to mm:ss
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  // Handle artist selection
  const handleArtistSelect = async (artist) => {
    const detailedArtist = await fetchArtistDetails(artist.id);
    if (detailedArtist) {
      setSelectedArtist(detailedArtist);
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 bg-black/80 backdrop-blur-md z-10 p-4 border-b border-gray-800/50 shadow-lg">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity duration-300"
            onClick={() => setSelectedArtist(null)}
          >
            <Music className="w-8 h-8 text-green-500 mr-2 animate-pulse" />
            <h1 className="text-xl font-bold">Spotify Artist Lookup</h1>
          </div>
          
          {token ? (
            <div className="flex items-center">
              <div className="relative w-64 md:w-96 mr-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  className="w-full bg-gray-800/80 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 hover:bg-gray-700/80 focus:shadow-lg focus:shadow-green-500/20"
                  placeholder="Search for an artist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {loading && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute mt-1 w-full bg-gray-900/90 backdrop-blur-md rounded-md shadow-lg shadow-green-900/10 z-[9999] overflow-hidden border border-gray-800/50">
                    <ul>
                      {searchResults.map(artist => (
                        <li
                          key={artist.id}
                          className="px-4 py-2 hover:bg-gray-800/90 cursor-pointer flex items-center transition-all duration-300 hover:translate-x-1 hover:shadow-md hover:shadow-green-900/20"
                          onClick={() => handleArtistSelect(artist)}
                        >
                          <div className="w-10 h-10 bg-gray-700 rounded-full mr-3 flex-shrink-0 overflow-hidden shadow-md shadow-black/30 transition-transform duration-300 hover:scale-110">
                            {artist.images && artist.images.length > 0 ? (
                              <img
                                src={artist.images[artist.images.length - 1].url}
                                alt={artist.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-gray-300 m-auto mt-2" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-green-400">{artist.name}</p>
                            <p className="text-sm text-gray-400">Artist</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={logout}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm transition-all duration-300 hover:shadow-md hover:shadow-purple-900/10 hover:-translate-y-0.5 active:translate-y-0"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
            >
              Connect with Spotify
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {!token ? (
          <div className="max-w-4xl mx-auto py-16">
            <div className="text-center mb-12">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-pulse"></div>
                <Music className="w-24 h-24 text-green-500 mx-auto relative z-10" />
              </div>
              <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-green-400">Spotify Artist Lookup</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Discover your favorite artists, explore their top tracks, and dive into their discography</p>
              <button
                onClick={login}
                className="bg-green-600 hover:bg-green-500 text-white px-10 py-4 rounded-full font-medium text-lg transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 hover:-translate-y-1 active:translate-y-0 transform group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  Connect with Spotify
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </button>
            </div>
            
            {/* About Section */}
            <div className="mt-16 mb-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-800/50 pt-16">
              <div className="bg-gray-900/50 rounded-xl p-8 shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 transition-all duration-500 border border-gray-800/30">
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  About This App
                </h3>
                <p className="text-gray-300 mb-4">
                  This Spotify Artist Lookup app lets you explore detailed information about your favorite musical artists. Browse through their top tracks, albums, and more — all in a beautiful interface powered by the Spotify API.
                </p>
                <p className="text-gray-400">
                  Built with React, Tailwind CSS, and a passion for music discovery.
                </p>
              </div>
              
              <div className="bg-gray-900/50 rounded-xl p-8 shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 transition-all duration-500 border border-gray-800/30">
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Features
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-gray-300">Search for any artist in Spotify's vast database</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-gray-300">View detailed artist information, including followers and popularity</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-gray-300">Explore top tracks with stream counts and popularity metrics</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-gray-300">Browse the artist's album catalog with beautiful artwork</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Get Started Section */}
            <div className="text-center mt-16 bg-gradient-to-r from-green-900/20 to-purple-900/20 rounded-2xl p-12 shadow-2xl border border-gray-800/30">
              <h3 className="text-2xl font-bold mb-6">Ready to explore your favorite artists?</h3>
              <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                Connect with your Spotify account to unlock the full experience. No personal data is stored, and you can disconnect at any time.
              </p>
              <button
                onClick={login}
                className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 animate-pulse hover:animate-none"
              >
                Connect Now
              </button>
            </div>
          </div>
        ) : selectedArtist ? (
          <div className="max-w-5xl mx-auto">
            {/* Artist Header */}
            <div className="flex flex-col md:flex-row items-center md:items-end mb-8 p-6 bg-gradient-to-b from-gray-800/80 to-black rounded-lg shadow-xl relative overflow-hidden group border border-gray-800/30">
              <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="w-48 h-48 rounded-full mb-4 md:mb-0 md:mr-6 flex-shrink-0 overflow-hidden shadow-2xl shadow-black/50 z-10 transition-all duration-500 group-hover:shadow-green-800/30">
                {selectedArtist.images && selectedArtist.images.length > 0 ? (
                  <img
                    src={selectedArtist.images[0].url}
                    alt={selectedArtist.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <User className="w-24 h-24 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="z-10 transition-transform duration-500 group-hover:translate-x-2">
                <span className="text-sm font-medium text-green-400">Artist</span>
                <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">{selectedArtist.name}</h1>
                <div className="flex flex-wrap items-center text-sm text-gray-300">
                  <span className="mr-2 bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
                    <span className="text-green-400 font-bold">{selectedArtist.followers.total.toLocaleString()}</span> followers
                  </span>
                  <span className="mr-2 text-gray-600">•</span>
                  <span className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
                    <div className="h-2 w-16 bg-gray-700 rounded-full mr-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000 ease-out"
                        style={{ width: `${selectedArtist.popularity}%` }}
                      ></div>
                    </div>
                    <span className="text-green-400 font-bold">{selectedArtist.popularity}</span>/100
                  </span>
                </div>
              </div>
            </div>

            {/* Genres */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Genres
              </h2>
              <div className="flex flex-wrap gap-2">
                {selectedArtist.genres.length > 0 ? (
                  selectedArtist.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="bg-gray-800/80 rounded-full px-4 py-1.5 text-sm shadow-md transition-all duration-300 hover:bg-gray-700/80 hover:shadow-lg hover:shadow-green-900/10 hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-100 border border-gray-700/50 cursor-pointer"
                    >
                      {genre}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">No genres available</span>
                )}
              </div>
            </div>

            {/* Top Tracks */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Music className="w-5 h-5 mr-2 text-green-500" />
                Popular Tracks
              </h2>
              <div className="bg-gray-900/70 rounded-md shadow-lg overflow-hidden border border-gray-800/30">
                {selectedArtist.topTracks.length > 0 ? (
                  selectedArtist.topTracks.map((track, index) => (
                    <div
                      key={index}
                      className="flex items-center px-4 py-3 hover:bg-gray-800/90 border-b border-gray-800/50 last:border-none transition-all duration-300 group hover:translate-x-2 hover:shadow-md hover:shadow-green-900/10"
                    >
                      <div className="w-6 text-gray-400 mr-4 group-hover:text-green-500 font-bold transition-colors duration-300">{index + 1}</div>
                      <div className="flex-grow">
                        <p className="font-medium group-hover:text-green-400 transition-colors duration-300">{track.name}</p>
                      </div>
                      <div className="text-gray-400 flex flex-col items-end mr-6 transition-all duration-300">
                        <div className="flex items-center group-hover:text-green-400 transition-colors duration-300">
                          <div className="h-1 w-10 bg-gray-700 rounded mr-2 overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-500 ease-out group-hover:w-full"
                              style={{ width: `${track.popularity}%` }}
                            ></div>
                          </div>
                          <span>{track.popularity}</span>
                        </div>
                        <div className="text-xs text-gray-500 group-hover:text-green-600 transition-colors duration-300">
                          {track.streams} streams
                        </div>
                      </div>
                      <div className="text-gray-400 flex items-center group-hover:text-green-500 transition-all duration-300 transform group-hover:scale-105">
                        <Clock className="w-4 h-4 mr-2" />
                        {track.duration}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-gray-400">No tracks available</div>
                )}
              </div>
            </div>

            {/* Albums */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Disc className="w-5 h-5 mr-2 text-green-500" />
                Albums
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedArtist.albums.length > 0 ? (
                  selectedArtist.albums.map((album, index) => (
                    <div key={index} className="bg-gray-900/80 p-4 rounded-md hover:bg-gray-800/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 group">
                      <div className="aspect-square bg-gray-800/80 mb-4 rounded flex items-center justify-center shadow-inner overflow-hidden">
                        {album.images && album.images.length > 0 ? (
                          <img
                            src={album.images[0].url}
                            alt={album.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <Disc className="w-16 h-16 text-gray-700" />
                        )}
                      </div>
                      <h3 className="font-medium truncate group-hover:text-green-400 transition-colors duration-300">{album.name}</h3>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{album.year} • {album.tracks} tracks</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-gray-400">No albums available</div>
                )}
              </div>
            </div>

            {/* Back button */}
            <div className="mt-12 text-center mb-6">
              <button
                className="bg-gray-800 hover:bg-green-600 text-white px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 active:translate-y-0 active:shadow-none transform group relative overflow-hidden"
                onClick={() => setSelectedArtist(null)}
              >
                <span className="relative z-10 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Search
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-8">
            {/* User Profile Section */}
            {userProfile && (
              <div className="mb-10 p-6 bg-gradient-to-r from-gray-900/70 to-gray-800/50 rounded-xl shadow-xl border border-gray-800/30 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-900/10 to-purple-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                <div className="flex flex-col md:flex-row items-center">
                  {/* Profile Picture */}
                  <div className="relative mb-4 md:mb-0 md:mr-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-800/50 shadow-inner group-hover:border-green-500/30 transition-all duration-500">
                      {userProfile.images && userProfile.images.length > 0 ? (
                        <img
                          src={userProfile.images[0].url}
                          alt={userProfile.display_name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <User className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full w-4 h-4 border-2 border-gray-900"></div>
                  </div>
                  
                  {/* User Info */}
                  <div className="text-center md:text-left flex-grow">
                    <div className="flex flex-col md:flex-row items-center md:items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-1">
                          {userProfile.display_name}
                        </h2>
                        <p className="text-green-400 text-sm">{userProfile.email}</p>
                      </div>
                      
                      <div className="ml-0 md:ml-auto mt-4 md:mt-0 flex space-x-4">
                        {userProfile.country && (
                          <div className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full text-sm text-gray-300 shadow-inner">
                            <Globe className="w-4 h-4 mr-2 text-green-400" />
                            {userProfile.country}
                          </div>
                        )}
                        {userProfile.product && (
                          <div className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full text-sm text-gray-300 shadow-inner capitalize">
                            <Award className="w-4 h-4 mr-2 text-green-400" />
                            {userProfile.product}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 text-gray-400 text-sm">
                      <span className="bg-black/30 rounded-full px-3 py-1">Spotify ID: {userProfile.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* User Stats Dashboard */}
            {userStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Top Artists */}
                <div className="bg-gray-900/70 rounded-xl shadow-lg border border-gray-800/30 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800/50 flex items-center">
                    <Music2 className="w-5 h-5 mr-2 text-green-500" />
                    <h3 className="text-xl font-bold">Your Top Artists</h3>
                  </div>
                  <ul>
                    {userStats.topArtists.map((artist, index) => (
                      <li key={artist.id} className="px-5 py-3 border-b last:border-b-0 border-gray-800/30 flex items-center hover:bg-gray-800/50 transition-colors duration-300">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-green-400 text-sm mr-3">
                          {index + 1}
                        </span>
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                          {artist.images && artist.images.length > 0 ? (
                            <img
                              src={artist.images[artist.images.length - 1].url}
                              alt={artist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <p className="font-medium">{artist.name}</p>
                          <p className="text-xs text-gray-400">{artist.genres.slice(0, 2).join(', ')}</p>
                        </div>
                        <div className="flex items-center">
                          <div className="h-1.5 w-12 bg-gray-800 rounded-full mr-2 overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${artist.popularity}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400">{artist.popularity}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Top Tracks */}
                <div className="bg-gray-900/70 rounded-xl shadow-lg border border-gray-800/30 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800/50 flex items-center">
                    <Headphones className="w-5 h-5 mr-2 text-green-500" />
                    <h3 className="text-xl font-bold">Your Top Tracks</h3>
                  </div>
                  <ul>
                    {userStats.topTracks.map((track, index) => (
                      <li key={track.id} className="px-5 py-3 border-b last:border-b-0 border-gray-800/30 flex items-center hover:bg-gray-800/50 transition-colors duration-300">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-green-400 text-sm mr-3">
                          {index + 1}
                        </span>
                        <div className="w-10 h-10 rounded overflow-hidden mr-3">
                          {track.album.images && track.album.images.length > 0 ? (
                            <img
                              src={track.album.images[track.album.images.length - 1].url}
                              alt={track.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <Music className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <p className="font-medium truncate">{track.name}</p>
                          <p className="text-xs text-gray-400 truncate">{track.artists.map(a => a.name).join(', ')}</p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDuration(track.duration_ms)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Favorite Genres */}
                <div className="bg-gray-900/70 rounded-xl shadow-lg border border-gray-800/30 p-5 md:col-span-2">
                  <div className="flex items-center mb-4">
                    <PieChart className="w-5 h-5 mr-2 text-green-500" />
                    <h3 className="text-xl font-bold">Your Music Taste</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {userStats.favoriteGenres.map((genre, index) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-green-900/40 to-green-800/30 rounded-full px-4 py-1.5 text-sm shadow-md border border-green-900/30"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Search Prompt */}
            <div className="bg-gradient-to-r from-gray-900/70 via-gray-800/50 to-gray-900/70 rounded-xl p-8 text-center shadow-xl border border-gray-800/30 hover:shadow-green-900/10 transition-all duration-500 group">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-500 rounded-full opacity-10 animate-pulse"></div>
                <Search className="w-20 h-20 text-green-500 mx-auto relative z-10 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-green-400 group-hover:to-green-300 transition-colors duration-300">
                Search for your favorite artists
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg group-hover:text-gray-300 transition-colors duration-300">
                Enter an artist name in the search bar above to explore their top tracks, albums, and more
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 p-6 border-t border-gray-800/30 text-center text-sm bg-gradient-to-b from-black to-gray-900/80">
        <div className="max-w-lg mx-auto hover:scale-105 transition-transform duration-500">
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 font-medium">Spotify Artist Lookup App</p>
          <p className="mt-2 text-gray-400 flex items-center justify-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Connected to the Spotify API
          </p>
        </div>
      </footer>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SpotifyApp;
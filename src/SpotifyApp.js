import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Disc, User, Clock, Award, BarChart2, Calendar, Headphones, Activity, Heart, Globe, Music2, Bookmark, PieChart, Play, Pause, SkipBack, SkipForward, Volume2, Volume, VolumeX } from 'lucide-react';

// Spotify API constants
const SPOTIFY_CLIENT_ID = 'ec65a3e0c919492c863a40dc1fb23c8e'; // Replace with your actual client ID
const REDIRECT_URI = window.location.origin + '/';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = 'user-read-private user-read-email user-top-read user-read-playback-state user-modify-playback-state streaming user-read-currently-playing';
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

// Spotify Attribution Component
const SpotifyAttribution = ({ type = "small", customClass = "" }) => {
  return type === "small" ? (
    <div className={`flex items-center text-xs text-gray-500 ${customClass}`}>
      <span>Powered by</span>
      <a 
        href="https://www.spotify.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="ml-1 text-green-500 hover:text-green-400 transition-colors duration-300 flex items-center"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="mr-1">
          <path d="M12 0C5.4 0 0 5.4 0 12C0 18.6 5.4 24 12 24C18.6 24 24 18.6 24 12C24 5.4 18.66 0 12 0ZM17.521 17.34C17.281 17.699 16.861 17.84 16.5 17.6C13.68 15.84 10.14 15.479 5.939 16.439C5.521 16.56 5.1 16.26 4.979 15.84C4.86 15.42 5.16 15 5.58 14.88C10.14 13.84 14.039 14.24 17.219 16.26C17.58 16.5 17.699 16.979 17.459 17.34ZM19.02 14.1C18.72 14.52 18.18 14.699 17.76 14.4C14.52 12.36 9.72 11.76 5.82 12.9C5.34 13.02 4.86 12.78 4.74 12.3C4.62 11.82 4.86 11.34 5.34 11.22C9.78 9.9 15.06 10.56 18.72 12.9C19.08 13.14 19.26 13.74 19.02 14.1Z" />
        </svg>
        Spotify
      </a>
    </div>
  ) : (
    <div className={`inline-flex items-center px-2 py-1 bg-gray-900/80 rounded-full text-xs ${customClass}`}>
      <span className="text-gray-400 mr-1">Content from</span>
      <a 
        href="https://www.spotify.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-green-500 hover:text-green-400 transition-colors duration-300 flex items-center"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="mr-1">
          <path d="M12 0C5.4 0 0 5.4 0 12C0 18.6 5.4 24 12 24C18.6 24 24 18.6 24 12C24 5.4 18.66 0 12 0ZM17.521 17.34C17.281 17.699 16.861 17.84 16.5 17.6C13.68 15.84 10.14 15.479 5.939 16.439C5.521 16.56 5.1 16.26 4.979 15.84C4.86 15.42 5.16 15 5.58 14.88C10.14 13.84 14.039 14.24 17.219 16.26C17.58 16.5 17.699 16.979 17.459 17.34ZM19.02 14.1C18.72 14.52 18.18 14.699 17.76 14.4C14.52 12.36 9.72 11.76 5.82 12.9C5.34 13.02 4.86 12.78 4.74 12.3C4.62 11.82 4.86 11.34 5.34 11.22C9.78 9.9 15.06 10.56 18.72 12.9C19.08 13.14 19.26 13.74 19.02 14.1Z" />
        </svg>
        Spotify
      </a>
    </div>
  );
};

const SpotifyApp = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('artist'); // Add this new state
  const [searchResults, setSearchResults] = useState({   // Update this state structure
    artists: [],
    albums: [],
    tracks: []
  });
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null); // Add this new state
  const [selectedTrack, setSelectedTrack] = useState(null); // Add this new state
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);
  const [recommendations, setRecommendations] = useState([]);

  // Player state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [volume, setVolume] = useState(50);

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

  // Add this effect after your other useEffect hooks
useEffect(() => {
  function handleClickOutside(event) {
    if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
      setSearchFocused(false);
    }
  }
  
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  // Fetch user profile and stats when token is available
  useEffect(() => {
    if (token) {
      // Fetch user profile data
      fetchUserProfile();
      
      // Fetch user stats
      fetchUserStats();
      
      // Load Spotify Web Playback SDK
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
      
      // Initialize Spotify Player
      window.onSpotifyWebPlaybackSDKReady = () => {
        const spotifyPlayer = new window.Spotify.Player({
          name: 'Find.fm Web Player',
          getOAuthToken: cb => { cb(token); },
          volume: 0.5
        });
        
        // Connect player
        spotifyPlayer.connect();
        
        // Set up event listeners
        spotifyPlayer.addListener('ready', ({ device_id }) => {
          console.log('Ready with Device ID', device_id);
          setDeviceId(device_id);
          setPlayer(spotifyPlayer);
        });
        
        spotifyPlayer.addListener('not_ready', ({ device_id }) => {
          console.log('Device ID has gone offline', device_id);
        });
        
        spotifyPlayer.addListener('player_state_changed', (state) => {
          if (!state) return;
          
          const { track_window: { current_track } } = state;
          setCurrentTrack(current_track);
          setIsPlaying(!state.paused);
        });
        
        // Error handling
        spotifyPlayer.addListener('initialization_error', ({ message }) => {
          console.error('Failed to initialize', message);
        });
        
        spotifyPlayer.addListener('authentication_error', ({ message }) => {
          console.error('Failed to authenticate', message);
          logout();
        });
        
        spotifyPlayer.addListener('account_error', ({ message }) => {
          console.error('Failed to validate account', message);
        });
      };
      
      return () => {
        // Clean up player on unmount
        if (player) {
          player.disconnect();
        }
      };
    }
  }, [token]);

  // Poll for currently playing track
useEffect(() => {
  if (!token) return;
  
  // Fetch immediately on load
  fetchCurrentlyPlaying();
  
  // Then set up polling every 5 seconds
  const interval = setInterval(() => {
    fetchCurrentlyPlaying();
  }, 5000);
  
  // Clean up on unmount
  return () => clearInterval(interval);
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


  // Function to fetch currently playing track from any Spotify device
const fetchCurrentlyPlaying = async () => {
  if (!token) return;
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // If no track is playing (204 No Content)
    if (response.status === 204) {
      setCurrentTrack(null);
      setIsPlaying(false);
      return;
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch currently playing track');
    }
    
    const data = await response.json();
    
    // Check if something is actually playing
    if (data && data.item) {
      setCurrentTrack(data.item);
      setIsPlaying(data.is_playing);
    } else {
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  } catch (error) {
    console.error('Error fetching currently playing track:', error);
  }
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
    
    // Disconnect player
    if (player) {
      player.disconnect();
      setPlayer(null);
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setDeviceId(null);
  };
  
  // Player control functions
  const togglePlayback = async () => {
    if (!player || !deviceId) return;
    
    try {
      if (isPlaying) {
        await fetch(`https://api.spotify.com/v1/me/player/pause`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };
  
  const skipToNext = async () => {
    if (!player || !deviceId) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/next`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };
  
  const skipToPrevious = async () => {
    if (!player || !deviceId) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/previous`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    }
  };
  
  const changeVolume = async (newVolume) => {
    if (!player) return;
    
    try {
      await player.setVolume(newVolume / 100);
      setVolume(newVolume);
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };
  
  const playTrack = async (trackUri) => {
    if (!player || !deviceId) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [trackUri]
        })
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const searchSpotify = async (query, type = searchType) => {
    if (!token || query.trim() === '') {
      setSearchResults({ artists: [], albums: [], tracks: [] });
      return;
    }
  
    setLoading(true);
    
    try {
      // Create the search types parameter based on current selection or 'all'
      let typesParam;
      if (type === 'all') {
        typesParam = 'artist,album,track';
      } else {
        typesParam = type;
      }
      
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=${typesParam}&limit=5`, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch data from Spotify');
      }
      
      const data = await response.json();
      
      // Update search results based on what was returned
      const results = {
        artists: data.artists?.items || [],
        albums: data.albums?.items || [],
        tracks: data.tracks?.items || []
      };
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching Spotify:', error);
      setSearchResults({ artists: [], albums: [], tracks: [] });
    } finally {
      setLoading(false);
    }
  };

  // Find this useEffect
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

// Replace with:
useEffect(() => {
  if (searchQuery.trim() === '') {
    setSearchResults({ artists: [], albums: [], tracks: [] });
    return;
  }

  const timeoutId = setTimeout(() => {
    searchSpotify(searchQuery);
  }, 500);

  return () => clearTimeout(timeoutId);
}, [searchQuery, searchType, token]);



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

const fetchRecommendations = async () => {
  if (!token || !userStats) return;
  
  try {
    // Make sure we have enough data for seeds
    if (!userStats.topArtists.length || !userStats.topTracks.length) {
      console.log("Not enough seed data available");
      return;
    }
    
    // Get seed artists and tracks from user's top items
    const seedArtists = userStats.topArtists.slice(0, 2).map(artist => artist.id).join(',');
    const seedTracks = userStats.topTracks.slice(0, 2).map(track => track.id).join(',');
    const seedGenres = userStats.favoriteGenres && userStats.favoriteGenres.length > 0 
      ? userStats.favoriteGenres.slice(0, 1).join(',') 
      : '';
    
    console.log('Seeds:', { seedArtists, seedTracks, seedGenres });
    
    // Build the URL with properly encoded parameters
    let url = 'https://api.spotify.com/v1/recommendations?limit=8';
    
    if (seedArtists) url += `&seed_artists=${encodeURIComponent(seedArtists)}`;
    if (seedTracks) url += `&seed_tracks=${encodeURIComponent(seedTracks)}`;
    if (seedGenres) url += `&seed_genres=${encodeURIComponent(seedGenres)}`;
    
    console.log("Requesting recommendations from:", url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error details:', errorData);
      throw new Error(`Failed to fetch recommendations: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Recommendations data:', data);
    setRecommendations(data.tracks || []);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    setRecommendations([]);
  }
};

// Add this to useEffect where you fetch user stats
useEffect(() => {
  if (token && userStats) {
    fetchRecommendations();
  }
}, [token, userStats]);

  // Add after fetchArtistDetails
const fetchAlbumDetails = async (albumId) => {
  if (!token) return null;
  
  setLoading(true);
  
  try {
    // Get album details
    const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!albumResponse.ok) throw new Error('Failed to fetch album data');
    const albumData = await albumResponse.json();
    
    // Format the data
    const formattedAlbum = {
      ...albumData,
      tracks: albumData.tracks.items.map((track, index) => ({
        ...track,
        duration: formatDuration(track.duration_ms),
        position: index + 1,
        // Generate estimated stream count based on popularity
      }))
    };
    
    return formattedAlbum;
  } catch (error) {
    console.error('Error fetching album details:', error);
    return null;
  } finally {
    setLoading(false);
  }
};

const fetchTrackDetails = async (trackId) => {
  if (!token) return null;
  
  setLoading(true);
  
  try {
    // Get track details
    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!trackResponse.ok) throw new Error('Failed to fetch track data');
    const trackData = await trackResponse.json();
    
    // Get audio features for the track
    const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    let audioFeatures = {};
    if (featuresResponse.ok) {
      audioFeatures = await featuresResponse.json();
    }
    
    // Fetch artist details for each artist
    const artistPromises = trackData.artists.map(async (artist) => {
      const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artist.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (artistResponse.ok) {
        return await artistResponse.json();
      }
      return artist;
    });
    
    const artistsWithDetails = await Promise.all(artistPromises);
    
    // Format the data
    const formattedTrack = {
      ...trackData,
      artists: artistsWithDetails,
      duration: formatDuration(trackData.duration_ms),
      features: audioFeatures
      // Removed estimated streams
    };
    
    return formattedTrack;
  } catch (error) {
    console.error('Error fetching track details:', error);
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

  const handleArtistSelect = async (artist) => {
    const detailedArtist = await fetchArtistDetails(artist.id);
    if (detailedArtist) {
      setSelectedArtist(detailedArtist);
      setSelectedAlbum(null);
      setSelectedTrack(null);
      setSearchResults({ artists: [], albums: [], tracks: [] });
      setSearchQuery('');
    }
  };

  // After your handleArtistSelect function
const handleAlbumSelect = async (album) => {
  const detailedAlbum = await fetchAlbumDetails(album.id);
  if (detailedAlbum) {
    setSelectedAlbum(detailedAlbum);
    setSelectedArtist(null);
    setSelectedTrack(null);
    setSearchResults({ artists: [], albums: [], tracks: [] });
    setSearchQuery('');
  }
};

const handleTrackSelect = async (track) => {
  const detailedTrack = await fetchTrackDetails(track.id);
  if (detailedTrack) {
    setSelectedTrack(detailedTrack);
    setSelectedArtist(null);
    setSelectedAlbum(null);
    setSearchResults({ artists: [], albums: [], tracks: [] });
    setSearchQuery('');
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white overflow-hidden">
{/* Header */}
<header className="sticky top-0 bg-black/80 backdrop-blur-md z-20 p-4 border-b border-gray-800/50 shadow-lg">
  <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3">
    <div
      className="flex items-center cursor-pointer hover:opacity-80 transition-opacity duration-300 mb-2 sm:mb-0"
      onClick={() => {
        setSelectedArtist(null);
        setSelectedAlbum(null);
        setSelectedTrack(null);
      }}
    >
      <Music className="w-7 h-7 text-green-500 mr-2 animate-pulse" />
      <h1 className="text-xl font-bold">find.fm</h1>
    </div>
    
    {token ? (
  <div className="flex flex-col sm:flex-row items-center w-full sm:w-auto">
    {/* Search type selectors */}
    <div className="flex items-center space-x-2 mb-2 sm:mb-0 sm:mr-3">
      <button
        onClick={() => setSearchType('artist')}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          searchType === 'artist'
            ? 'bg-green-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        Artists
      </button>
      <button
        onClick={() => setSearchType('album')}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          searchType === 'album'
            ? 'bg-green-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        Albums
      </button>
      <button
        onClick={() => setSearchType('track')}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          searchType === 'track'
            ? 'bg-green-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        Tracks
      </button>
      <button
        onClick={() => setSearchType('all')}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          searchType === 'all'
            ? 'bg-green-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        All
      </button>
    </div>
    
    <div
      className="relative w-full sm:w-64 md:w-80 mb-2 sm:mb-0 sm:mr-3" 
      ref={searchContainerRef}
      onFocus={() => setSearchFocused(true)}
    >
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
      
      {/* New search results dropdown */}
      {(searchResults.artists.length > 0 || 
        searchResults.albums.length > 0 || 
        searchResults.tracks.length > 0) && 
        searchFocused && (
        <div className="absolute mt-1 w-full bg-gray-900/90 backdrop-blur-md rounded-md shadow-lg shadow-green-900/10 z-50 overflow-hidden border border-gray-800/50">
          {/* Artists Results */}
          {searchResults.artists.length > 0 && (searchType === 'artist' || searchType === 'all') && (
            <>
              <div className="px-4 py-2 bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider font-bold">
                Artists
              </div>
              <ul>
                {searchResults.artists.map(artist => (
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
            </>
          )}
          
          {/* Albums Results */}
          {searchResults.albums.length > 0 && (searchType === 'album' || searchType === 'all') && (
            <>
              <div className="px-4 py-2 bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider font-bold">
                Albums
              </div>
              <ul>
                {searchResults.albums.map(album => (
                  <li
                    key={album.id}
                    className="px-4 py-2 hover:bg-gray-800/90 cursor-pointer flex items-center transition-all duration-300 hover:translate-x-1 hover:shadow-md hover:shadow-green-900/20"
                    onClick={() => handleAlbumSelect(album)}
                  >
                    <div className="w-10 h-10 bg-gray-700 rounded mr-3 flex-shrink-0 overflow-hidden shadow-md shadow-black/30 transition-transform duration-300 hover:scale-110">
                      {album.images && album.images.length > 0 ? (
                        <img
                          src={album.images[album.images.length - 1].url}
                          alt={album.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Disc className="w-6 h-6 text-gray-300 m-auto mt-2" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-green-400">{album.name}</p>
                      <p className="text-sm text-gray-400">
                        {album.artists?.map(a => a.name).join(', ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          
          {/* Tracks Results */}
          {searchResults.tracks.length > 0 && (searchType === 'track' || searchType === 'all') && (
            <>
              <div className="px-4 py-2 bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider font-bold">
                Tracks
              </div>
              <ul>
                {searchResults.tracks.map(track => (
                  <li
                    key={track.id}
                    className="px-4 py-2 hover:bg-gray-800/90 cursor-pointer flex items-center transition-all duration-300 hover:translate-x-1 hover:shadow-md hover:shadow-green-900/20"
                    onClick={() => handleTrackSelect(track)}
                  >
                    <div className="w-10 h-10 bg-gray-700 rounded mr-3 flex-shrink-0 overflow-hidden shadow-md shadow-black/30 transition-transform duration-300 hover:scale-110">
                      {track.album?.images && track.album.images.length > 0 ? (
                        <img
                          src={track.album.images[track.album.images.length - 1].url}
                          alt={track.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-6 h-6 text-gray-300 m-auto mt-2" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-green-400">{track.name}</p>
                      <p className="text-sm text-gray-400">
                        {track.artists?.map(a => a.name).join(', ')}
                      </p>
                    </div>
                    <div className="ml-auto text-xs text-gray-500">
                      {formatDuration(track.duration_ms)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
    <button
      onClick={logout}
      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm transition-all duration-300 hover:shadow-md hover:shadow-purple-900/10 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
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
  <Music className="w-24 h-24 text-green-500 mx-auto relative z-10" />
</div>
        <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-green-400">find.fm</h2>
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
            This find.fm app lets you explore detailed information about your favorite musical artists. Browse through their top tracks, albums, and more — all in a beautiful interface powered by the Spotify API.
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
              <span className="text-gray-300">Search for any artist, album, or track in Spotify's vast database</span>
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
              <span className="text-gray-300">Browse album catalogs and track details with beautiful artwork</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Get Started Section */}
      <div className="text-center mt-16 bg-gradient-to-r from-green-900/20 to-purple-900/20 rounded-2xl p-12 shadow-2xl border border-gray-800/30">
        <h3 className="text-2xl font-bold mb-6">Ready to explore your favorite music?</h3>
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
  className="flex items-center px-4 py-3 hover:bg-gray-800/90 border-b border-gray-800/50 last:border-none transition-all duration-300 group hover:translate-x-2 hover:shadow-md hover:shadow-green-900/10 cursor-pointer"
  onClick={() => {
    // Create a simplified track object with the basic info needed for handleTrackSelect
    const trackForSelection = {
      id: track.id,
      name: track.name,
      artists: [{ id: selectedArtist.id, name: selectedArtist.name }],
      duration_ms: track.duration_ms || 0,
      album: {
        images: selectedArtist.images || []
      }
    };
    handleTrackSelect(trackForSelection);
  }}
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
              <div 
                key={index} 
                className="bg-gray-900/80 p-4 rounded-md hover:bg-gray-800/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 group cursor-pointer"
                onClick={() => handleAlbumSelect(album)}
              >
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
  ) : selectedAlbum ? (
    <div className="max-w-5xl mx-auto">
      {/* Album Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end mb-8 p-6 bg-gradient-to-b from-gray-800/80 to-black rounded-lg shadow-xl relative overflow-hidden group border border-gray-800/30">
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div className="w-48 h-48 rounded mb-4 md:mb-0 md:mr-6 flex-shrink-0 overflow-hidden shadow-2xl shadow-black/50 z-10 transition-all duration-500 group-hover:shadow-green-800/30">
          {selectedAlbum.images && selectedAlbum.images.length > 0 ? (
            <img
              src={selectedAlbum.images[0].url}
              alt={selectedAlbum.name}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <Disc className="w-24 h-24 text-gray-300" />
            </div>
          )}
        </div>
        
        <div className="z-10 transition-transform duration-500 group-hover:translate-x-2">
          <span className="text-sm font-medium text-green-400">Album</span>
          <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">{selectedAlbum.name}</h1>
          <div className="flex flex-wrap items-center text-sm text-gray-300">
            <span className="mr-2 bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
            By <span 
              className="text-green-400 font-bold cursor-pointer hover:underline" 
              onClick={(e) => {
                e.stopPropagation();
                if (selectedAlbum.artists && selectedAlbum.artists.length > 0) {
                  handleArtistSelect(selectedAlbum.artists[0]);
                }
              }}
            >
              {selectedAlbum.artists.map(a => a.name).join(', ')}
            </span>
          </span>
            <span className="mr-2 text-gray-600">•</span>
            <span className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
              <Calendar className="w-4 h-4 mr-1 text-green-400" />
              {new Date(selectedAlbum.release_date).getFullYear()}
            </span>
            <span className="mr-2 text-gray-600">•</span>
            <span className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
              <Music className="w-4 h-4 mr-1 text-green-400" />
              {selectedAlbum.total_tracks} tracks
            </span>
            <span className="mr-2 text-gray-600">•</span>
            <span className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
              <div className="h-2 w-16 bg-gray-700 rounded-full mr-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000 ease-out"
                  style={{ width: `${selectedAlbum.popularity || 70}%` }}
                ></div>
              </div>
              <span className="text-green-400 font-bold">{selectedAlbum.popularity || '–'}</span>/100
            </span>
          </div>
        </div>
      </div>

{/* Album Tracks */}
<div className="mb-8">
  <h2 className="text-xl font-bold mb-4 flex items-center">
    <Music className="w-5 h-5 mr-2 text-green-500" />
    Tracks
  </h2>
  <div className="bg-gray-900/70 rounded-md shadow-lg overflow-hidden border border-gray-800/30">
    {selectedAlbum.tracks && selectedAlbum.tracks.length > 0 ? (
      selectedAlbum.tracks.map((track, index) => (
        <div
          key={track.id}
          className="flex items-center px-4 py-3 hover:bg-gray-800/90 border-b border-gray-800/50 last:border-none transition-all duration-300 group hover:translate-x-2 hover:shadow-md hover:shadow-green-900/10 cursor-pointer"
          onClick={() => {
            // Create a track object with the necessary data for handleTrackSelect
            const trackForSelection = {
              id: track.id,
              name: track.name,
              artists: track.artists || selectedAlbum.artists,
              duration_ms: track.duration_ms || 0,
              album: {
                id: selectedAlbum.id,
                name: selectedAlbum.name,
                images: selectedAlbum.images,
                release_date: selectedAlbum.release_date
              },
              uri: track.uri
            };
            handleTrackSelect(trackForSelection);
          }}
        >
          <div className="w-6 text-gray-400 mr-4 group-hover:text-green-500 font-bold transition-colors duration-300">{track.position || (index + 1)}</div>
          <div className="flex-grow">
            <p className="font-medium group-hover:text-green-400 transition-colors duration-300">{track.name}</p>
            {!selectedAlbum.is_compilation && (
              <p className="text-sm text-gray-500">
                {track.artists?.map(a => a.name).join(', ') || selectedAlbum.artists.map(a => a.name).join(', ')}
              </p>
            )}
          </div>
          <div className="text-gray-400 flex items-center mr-4 group-hover:text-green-500 transition-all duration-300">
            <Play 
              className="w-5 h-5 cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200" 
              onClick={(e) => {
                e.stopPropagation();
                playTrack(track.uri);
              }}
            />
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

      {/* Copyrights */}
      {selectedAlbum.copyrights && selectedAlbum.copyrights.length > 0 && (
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800/30">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Copyright Information</h3>
          {selectedAlbum.copyrights.map((copyright, index) => (
            <p key={index} className="text-xs text-gray-500">
              {copyright.text}
            </p>
          ))}
        </div>
      )}

      {/* Back button */}
      <div className="mt-12 text-center mb-6">
        <button
          className="bg-gray-800 hover:bg-green-600 text-white px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 active:translate-y-0 active:shadow-none transform group relative overflow-hidden"
          onClick={() => setSelectedAlbum(null)}
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
  ) : selectedTrack ? (
    <div className="max-w-5xl mx-auto">
      {/* Track Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end mb-8 p-6 bg-gradient-to-b from-gray-800/80 to-black rounded-lg shadow-xl relative overflow-hidden group border border-gray-800/30">
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div className="w-48 h-48 rounded mb-4 md:mb-0 md:mr-6 flex-shrink-0 overflow-hidden shadow-2xl shadow-black/50 z-10 transition-all duration-500 group-hover:shadow-green-800/30">
          {selectedTrack.album?.images && selectedTrack.album.images.length > 0 ? (
            <img
              src={selectedTrack.album.images[0].url}
              alt={selectedTrack.name}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <Music className="w-24 h-24 text-gray-300" />
            </div>
          )}
        </div>
        
        <div className="z-10 transition-transform duration-500 group-hover:translate-x-2">
          <span className="text-sm font-medium text-green-400">Track</span>
          <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">{selectedTrack.name}</h1>
          <div className="flex flex-wrap items-center text-sm text-gray-300 mb-4">
          <span className="mr-2 bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
              By <span 
                className="text-green-400 font-bold cursor-pointer hover:underline" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedTrack.artists && selectedTrack.artists.length > 0) {
                    handleArtistSelect(selectedTrack.artists[0]);
                  }
                }}
              >
                {selectedTrack.artists.map(a => a.name).join(', ')}
              </span>
            </span>
            <span className="mr-2 text-gray-600">•</span>
            <span 
  className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300 cursor-pointer"
  onClick={(e) => {
    e.stopPropagation();
    handleAlbumSelect(selectedTrack.album);
  }}
>
  <Disc className="w-4 h-4 mr-1 text-green-400" />
  <span className="hover:text-green-400 transition-colors duration-300">
    {selectedTrack.album.name}
  </span>
</span>
            <span className="mr-2 text-gray-600">•</span>
            <span className="flex items-center bg-gray-800/80 px-3 py-1 rounded-full shadow-inner hover:bg-gray-700/80 transition-colors duration-300">
              <Calendar className="w-4 h-4 mr-1 text-green-400" />
              {new Date(selectedTrack.album.release_date).getFullYear()}
            </span>
          </div>
          
          <div className="flex mt-4 space-x-2">
            <button
              onClick={() => playTrack(selectedTrack.uri)}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full flex items-center text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 active:translate-y-0
            active:shadow-none"
            >
              <Play className="w-4 h-4 mr-1" />
              Play on Spotify
            </button>
            
            <a
              href={selectedTrack.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm transition-all duration-300 hover:shadow-md hover:shadow-purple-900/10 hover:-translate-y-0.5 active:translate-y-0 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.4 0 0 5.4 0 12C0 18.6 5.4 24 12 24C18.6 24 24 18.6 24 12C24 5.4 18.66 0 12 0ZM17.521 17.34C17.281 17.699 16.861 17.84 16.5 17.6C13.68 15.84 10.14 15.479 5.939 16.439C5.521 16.56 5.1 16.26 4.979 15.84C4.86 15.42 5.16 15 5.58 14.88C10.14 13.84 14.039 14.24 17.219 16.26C17.58 16.5 17.699 16.979 17.459 17.34ZM19.02 14.1C18.72 14.52 18.18 14.699 17.76 14.4C14.52 12.36 9.72 11.76 5.82 12.9C5.34 13.02 4.86 12.78 4.74 12.3C4.62 11.82 4.86 11.34 5.34 11.22C9.78 9.9 15.06 10.56 18.72 12.9C19.08 13.14 19.26 13.74 19.02 14.1Z" />
              </svg>
              View on Spotify
            </a>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Content and branding © Spotify AB - A link to the official provider is included as required by Spotify terms.
          </div>
        </div>
      </div>

      {/* Track Details and Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Track Info */}
        <div className="bg-gray-900/70 rounded-md shadow-lg overflow-hidden border border-gray-800/30 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Music className="w-5 h-5 mr-2 text-green-500" />
            Track Info
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Duration</p>
              <p className="text-lg font-medium">{selectedTrack.duration}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Popularity</p>
              <div className="flex items-center">
                <div className="h-2 w-full max-w-xs bg-gray-800 rounded-full mr-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400"
                    style={{ width: `${selectedTrack.popularity}%` }}
                  ></div>
                </div>
                <span>{selectedTrack.popularity}/100</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Album</p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded overflow-hidden mr-3">
                  {selectedTrack.album?.images && selectedTrack.album.images.length > 0 ? (
                    <img
                      src={selectedTrack.album.images[selectedTrack.album.images.length - 1].url}
                      alt={selectedTrack.album.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <Disc className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>
                <button 
                  className="text-white hover:text-green-400 transition-colors duration-300"
                  onClick={() => handleAlbumSelect(selectedTrack.album)}
                >
                  {selectedTrack.album.name}
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Track Number</p>
              <p className="text-lg font-medium">{selectedTrack.track_number} of {selectedTrack.album.total_tracks}</p>
            </div>
            
            {selectedTrack.explicit && (
              <div className="bg-gray-800/80 px-3 py-1 rounded-full inline-block text-sm">
                Explicit
              </div>
            )}
          </div>
        </div>
        
        {/* Audio Features */}
        {selectedTrack.features && Object.keys(selectedTrack.features).length > 0 && (
          <div className="bg-gray-900/70 rounded-md shadow-lg overflow-hidden border border-gray-800/30 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <BarChart2 className="w-5 h-5 mr-2 text-green-500" />
              Audio Features
            </h2>
            
            {/* Key and Mode */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Key & Mode</p>
              <div className="flex items-center space-x-2">
                <div className="bg-gray-800 rounded-lg px-3 py-1 text-green-400 font-medium">
                  {['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'][selectedTrack.features.key]}
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-1 text-green-400 font-medium">
                  {selectedTrack.features.mode === 1 ? 'Major' : 'Minor'}
                </div>
              </div>
            </div>
            
            {/* Tempo */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Tempo (BPM)</p>
              <p className="text-lg font-medium">{Math.round(selectedTrack.features.tempo)}</p>
            </div>
            
            {/* Feature Bars */}
            <div className="space-y-3">
              {[
                { name: 'Danceability', value: selectedTrack.features.danceability },
                { name: 'Energy', value: selectedTrack.features.energy },
                { name: 'Acousticness', value: selectedTrack.features.acousticness },
                { name: 'Instrumentalness', value: selectedTrack.features.instrumentalness },
                { name: 'Liveness', value: selectedTrack.features.liveness },
                { name: 'Valence (Positivity)', value: selectedTrack.features.valence }
              ].map((feature, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{feature.name}</span>
                    <span className="text-gray-300">{Math.round(feature.value * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${feature.value * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Artists Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-green-500" />
          Artists
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {selectedTrack.artists.map((artist, index) => (
            <div 
              key={index} 
              className="bg-gray-900/80 p-4 rounded-md hover:bg-gray-800/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 group cursor-pointer"
              onClick={() => {
                if (artist.id) {
                  handleArtistSelect(artist);
                }
              }}
            >
              <div className="aspect-square bg-gray-800/80 mb-4 rounded-full flex items-center justify-center shadow-inner overflow-hidden">
        {artist.images && artist.images.length > 0 ? (
          <img
            src={artist.images[0].url}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <User className="w-16 h-16 text-gray-700" />
        )}
      </div>
      <h3 className="font-medium truncate text-center group-hover:text-green-400 transition-colors duration-300">{artist.name}</h3>
    </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <div className="mt-12 text-center mb-6">
        <button
          className="bg-gray-800 hover:bg-green-600 text-white px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 active:translate-y-0 active:shadow-none transform group relative overflow-hidden"
          onClick={() => setSelectedTrack(null)}
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
                <li 
                key={artist.id} 
                className="px-5 py-3 border-b last:border-b-0 border-gray-800/30 flex items-center hover:bg-gray-800/50 transition-colors duration-300 cursor-pointer"
                onClick={() => handleArtistSelect(artist)}
                >
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
                                      <li
                        key={track.id}
                        className="px-5 py-3 border-b last:border-b-0 border-gray-800/30 flex items-center hover:bg-gray-800/50 transition-colors duration-300 cursor-pointer"
                        onClick={() => handleTrackSelect(track)}
                      >                  
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
          {/* After the grid with Top Artists and Top Tracks */}
          <div className="mb-10 mt-6 max-w-4xl mx-auto">
  <h2 className="text-2xl font-bold mb-4 flex items-center">
    <Bookmark className="w-6 h-6 mr-2 text-green-500" />
    Discover New Music
  </h2>
  
  {loading ? (
    <div className="text-center py-12">
      <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gray-400">Finding music you might like...</p>
    </div>
  ) : recommendations.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {recommendations.map((track) => (
        <div 
          key={track.id} 
          className="bg-gray-900/80 rounded-lg overflow-hidden shadow-lg hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 group transition-all duration-300 cursor-pointer"
          onClick={() => handleTrackSelect(track)}
        >
          <div className="aspect-square bg-gray-800 overflow-hidden">
            {track.album?.images && track.album.images.length > 0 ? (
              <img 
                src={track.album.images[0].url} 
                alt={track.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <Music className="w-16 h-16 text-gray-700 m-auto mt-16" />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-medium truncate group-hover:text-green-400 transition-colors duration-300">{track.name}</h3>
            <p className="text-sm text-gray-400 truncate">{track.artists?.map(a => a.name).join(', ')}</p>
            <div className="mt-3 flex justify-between items-center">
              <div className="text-xs text-gray-500">{formatDuration(track.duration_ms)}</div>
              <button 
                className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  playTrack(track.uri);
                }}
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="bg-gray-900/50 rounded-xl p-6 text-center border border-gray-800/30 shadow-lg">
      <Music2 className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
      <p className="text-gray-400 mb-2">No recommendations available right now</p>
      <p className="text-sm text-gray-500">Try listening to more music to get personalized recommendations</p>
    </div>
  )}
</div>
        </div>
        
      )}
      
      
{/* Search Prompt */}
<div className="bg-gradient-to-r from-gray-900/70 via-gray-800/50 to-gray-900/70 rounded-xl p-8 text-center shadow-xl border border-gray-800/30 hover:shadow-green-900/10 transition-all duration-500 group">
  {/* Currently Listening Section */}
  <div className="bg-gradient-to-r from-gray-900/70 to-gray-800/60 rounded-xl p-4 sm:p-5 mb-10 border border-gray-800/30 shadow-lg hover:shadow-green-900/10 transition-all duration-500 opacity-80">
    <div className="flex items-center mb-2">
      <Headphones className="w-5 h-5 mr-2 text-green-500" />
      <h3 className="text-lg sm:text-xl font-bold">Currently Listening</h3>
    </div>
    
    {!currentTrack ? (
      // Nothing playing UI
      <div className="flex items-center p-3 bg-black/20 rounded-lg">
        <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gray-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
          <Music className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700" />
        </div>
        <div>
          <p className="text-gray-400">Nothing playing right now</p>
          <p className="text-xs text-gray-500 mt-1">
            Play something on Spotify to see it here
          </p>
        </div>
      </div>
    ) : (
      // Track playing UI
      <div className="flex items-center p-3 bg-black/30 rounded-lg">
        <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gray-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4 overflow-hidden shadow-lg relative">
          {currentTrack.album?.images && currentTrack.album.images.length > 0 ? (
            <img
              src={currentTrack.album.images[0].url}
              alt={currentTrack.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <Music className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
          )}
        </div>
        <div className="flex-grow text-left">
          <p className="font-medium text-white truncate">{currentTrack.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {currentTrack.artists?.map(a => a.name).join(', ')}
          </p>
          
          {/* Track progress */}
          <div className="flex items-center mt-1.5 text-xs text-gray-500">
            <span>{formatDuration(Math.floor(currentTrack.duration_ms * 0.4))}</span>
            <div className="mx-2 flex-grow h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500"
                style={{ width: '40%' }}
              ></div>
            </div>
            <span>{formatDuration(currentTrack.duration_ms)}</span>
          </div>
          
          {/* Audio visualizer animation */}
          <div className="flex items-center h-2 mt-1 gap-0.5">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i}
                className={`w-0.5 bg-green-500 rounded-full mx-px transform-gpu ${isPlaying ? '' : 'h-0.5'}`}
                style={{
                  height: isPlaying ? `${Math.max(2, Math.floor(Math.random() * 8))}px` : '1px',
                  animationDelay: `${i * 0.1}s`,
                  animation: isPlaying ? 'equalizer 0.8s ease-in-out infinite' : 'none'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
  
  <div className="relative w-20 h-20 mx-auto mb-6">
  <Search className="w-20 h-20 text-green-500 mx-auto relative z-10 group-hover:scale-110 transition-transform duration-500" />
</div>

  <h2 className="text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-green-400 group-hover:to-green-300 transition-colors duration-300">
    Search for your favorite music
  </h2>
  <p className="text-gray-400 max-w-2xl mx-auto text-lg group-hover:text-gray-300 transition-colors duration-300">
    Enter artist, album, or track names in the search bar above to explore detailed information, audio features, and more
  </p>
</div>
    </div>
  )}
</main>
      {/* Footer */}
      <footer className="mt-12 p-6 border-t border-gray-800/30 text-center text-sm bg-gray-900/80">
        <div className="max-w-lg mx-auto">
          <div className="flex flex-col items-center justify-center">
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 font-medium mb-2">find.fm</p>
            <div className="flex items-center justify-center mb-3">
              <span className="text-gray-400 mr-2">Powered by</span>
              <a href="https://www.spotify.com" target="_blank" rel="noopener noreferrer" className="inline-block">
                {/* Spotify logo - simplified SVG */}
                <svg width="80" height="24" viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.373 0 0 5.373 0 12C0 18.627 5.373 24 12 24C18.627 24 24 18.627 24 12C24 5.373 18.627 0 12 0ZM17.535 17.303C17.281 17.692 16.861 17.84 16.5 17.6C13.68 15.84 10.14 15.479 5.939 16.439C5.521 16.56 5.1 16.26 4.979 15.84C4.86 15.42 5.16 15 5.58 14.88C10.14 13.84 14.039 14.24 17.219 16.26C17.58 16.5 17.699 16.979 17.459 17.34ZM19.02 14.1C18.72 14.52 18.18 14.699 17.76 14.4C14.52 12.36 9.72 11.76 5.82 12.9C5.34 13.02 4.86 12.78 4.74 12.3C4.62 11.82 4.86 11.34 5.34 11.22C9.78 9.9 15.06 10.56 18.72 12.9C19.08 13.14 19.26 13.74 19.02 14.1Z" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M38.761 9.517C36.974 8.925 36.636 8.5 36.636 7.75C36.636 7.042 37.277 6.55 38.235 6.55C39.166 6.55 40.09 6.925 41.05 7.7C41.082 7.731 41.122 7.743 41.161 7.737C41.201 7.731 41.232 7.71 41.258 7.679L42.296 6.35C42.35 6.278 42.342 6.175 42.28 6.108C41.066 5.031 39.724 4.527 38.265 4.527C36.227 4.527 34.417 5.828 34.417 7.858C34.417 10.047 35.768 10.809 37.94 11.556C39.851 12.178 40.183 12.644 40.183 13.377C40.183 14.25 39.469 14.75 38.331 14.75C37.036 14.75 36.004 14.26 34.9 13.2C34.872 13.169 34.833 13.152 34.793 13.152C34.753 13.152 34.71 13.169 34.683 13.195L33.518 14.448C33.461 14.516 33.464 14.624 33.533 14.688C34.85 16 36.537 16.788 38.285 16.788C40.511 16.788 42.401 15.544 42.401 13.244C42.401 11.436 41.34 10.477 38.761 9.517Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M49.117 9.633C48.04 9.633 47.098 10.115 46.383 11.1V9.985C46.383 9.903 46.318 9.839 46.236 9.839H44.324C44.242 9.839 44.177 9.903 44.177 9.985V20.684C44.177 20.767 44.242 20.831 44.324 20.831H46.236C46.318 20.831 46.383 20.767 46.383 20.684V16.483C47.098 17.423 48.04 17.877 49.117 17.877C51.201 17.877 53.283 16.347 53.283 13.753C53.283 11.16 51.201 9.633 49.117 9.633ZM51.077 13.753C51.077 15.04 50.141 16.081 48.859 16.081C47.59 16.081 46.604 15.001 46.604 13.753C46.604 12.505 47.59 11.425 48.859 11.425C50.126 11.425 51.077 12.482 51.077 13.753Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M59.182 9.632C56.774 9.632 54.848 11.503 54.848 13.758C54.848 16.007 56.757 17.867 59.149 17.867C61.572 17.867 63.515 16.005 63.515 13.758C63.515 11.51 61.589 9.632 59.182 9.632ZM59.182 16.075C58.017 16.075 57.054 15.066 57.054 13.753C57.054 12.431 57.993 11.444 59.149 11.444C60.32 11.444 61.309 12.455 61.309 13.776C61.309 15.098 60.341 16.075 59.182 16.075Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M69.927 9.84H67.922V7.867C67.922 7.785 67.857 7.721 67.775 7.721H65.863C65.781 7.721 65.716 7.785 65.716 7.867V9.84H64.879C64.797 9.84 64.732 9.904 64.732 9.986V11.61C64.732 11.692 64.797 11.756 64.879 11.756H65.716V15.654C65.716 17.143 66.511 17.827 67.995 17.827C68.693 17.827 69.277 17.669 69.836 17.349C69.893 17.316 69.927 17.257 69.927 17.192V15.612C69.927 15.553 69.898 15.496 69.847 15.466C69.796 15.432 69.731 15.428 69.677 15.456C69.349 15.596 69.031 15.666 68.684 15.666C68.157 15.666 67.942 15.449 67.942 14.923V11.758H69.927C70.009 11.758 70.074 11.694 70.074 11.612V9.988C70.077 9.906 70.013 9.842 69.927 9.84Z" fill="white"/>
                  <path d="M75.424 9.845V9.597C75.424 9.071 75.696 8.82 76.226 8.82C76.573 8.82 76.843 8.89 77.141 8.989C77.198 9.006 77.258 8.999 77.3 8.967C77.343 8.935 77.371 8.883 77.371 8.827V7.296C77.371 7.228 77.33 7.167 77.268 7.145C76.944 7.045 76.537 6.944 75.938 6.944C74.516 6.944 73.249 7.883 73.249 9.508V9.834H72.412C72.33 9.834 72.265 9.898 72.265 9.98V11.61C72.265 11.692 72.33 11.757 72.412 11.757H73.249V17.706C73.249 17.788 73.314 17.852 73.396 17.852H75.308C75.39 17.852 75.455 17.788 75.455 17.706V11.757H76.945L78.738 17.706C78.452 18.351 78.171 18.504 77.774 18.504C77.455 18.504 77.123 18.422 76.788 18.26C76.754 18.242 76.715 18.238 76.678 18.248C76.642 18.262 76.612 18.286 76.594 18.32L75.966 19.778C75.934 19.846 75.959 19.93 76.025 19.965C76.66 20.261 77.223 20.39 77.889 20.39C79.215 20.39 79.989 19.78 80.672 17.63L82.969 10.003C82.988 9.957 82.983 9.904 82.958 9.863C82.932 9.822 82.889 9.799 82.843 9.799H80.817C80.752 9.799 80.694 9.843 80.677 9.905L79.096 15.324L77.319 9.903C77.3 9.842 77.243 9.799 77.18 9.799H75.424V9.845Z" fill="white"/>
                  <path d="M62.823 9.839H60.912C60.83 9.839 60.765 9.903 60.765 9.985V17.706C60.765 17.788 60.83 17.852 60.912 17.852H62.823C62.905 17.852 62.97 17.788 62.97 17.706V9.985C62.97 9.903 62.905 9.839 62.823 9.839Z" fill="white"/>
                  <path d="M61.871 6.167C61.188 6.167 60.637 6.719 60.637 7.403C60.637 8.09 61.188 8.645 61.871 8.645C62.554 8.645 63.105 8.09 63.105 7.403C63.105 6.719 62.56 6.167 61.871 6.167Z" fill="white"/>
                </svg>
              </a>
            </div>
            <p className="text-gray-400 flex items-center justify-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Spotify content and branding © Spotify AB. This site is not affiliated with Spotify.
            </p>
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      
{/* CSS for animations */}
<style jsx global>{`
  @keyframes equalizer {
    0%, 100% {
      height: 3px;
    }
    50% {
      height: 12px;
    }
  }

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
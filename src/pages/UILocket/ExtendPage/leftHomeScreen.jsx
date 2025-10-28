import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import { AuthContext } from "../../../context/AuthLocket";
import { ChevronRight, Link, Settings } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import AddPostButton from "./Button/AddPostButton";
import axios from "axios";
import LoadingRing from "../../../components/UI/Loading/ring";
import PostCard from "./Container/PostCaptionItems";
import { API_URL } from "../../../utils";
import BadgePlan from "./Badge";

const LeftHomeScreen = () => {
  const { user } = useContext(AuthContext);
  const { navigation, useloading } = useApp();
  const { isProfileOpen, setIsProfileOpen } = navigation;
  const { imageLoaded, setImageLoaded } = useloading;

  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Retry state
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 1000; // 1 second delay between retries

  const loaderRef = useRef(null);
  const debounceRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  const fetchPosts = useCallback(async (token = null, isRetryAttempt = false) => {
    // Prevent new requests if already loading (unless it's a retry) or no more data
    if ((!isRetryAttempt && loading) || (!hasMore && token) || isRetrying) return;
    
    setLoading(true);
    if (!isRetryAttempt) {
      setError(null);
      setRetryCount(0);
    }
    
    try {
      const url = token
        ? `${API_URL.CAPTION_POSTS_URL}?next_token=${token}`
        : API_URL.CAPTION_POSTS_URL;

      const response = await axios.get(url);
      const newPosts = response.data.captions || [];
      const newToken = response.data.next_token || null;

      setPosts((prev) => [...prev, ...newPosts]);
      setNextToken(newToken);
      setHasMore(Boolean(newToken));
      
      // Reset retry states on success
      setRetryCount(0);
      setError(null);
      setIsRetrying(false);
    } catch (error) {
      console.error("Error fetching posts:", error);
      
      // Only retry if this wasn't already a retry attempt
      if (!isRetryAttempt && retryCount < MAX_RETRY_ATTEMPTS) {
        const nextAttempt = retryCount + 1;
        setRetryCount(nextAttempt);
        setIsRetrying(true);
        
        console.log(`Retrying... Attempt ${nextAttempt}/${MAX_RETRY_ATTEMPTS}`);
        
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchPosts(token, true); // Mark as retry attempt
        }, delay);
        
        return; // Don't set loading to false yet
      } else {
        // Max retries reached or this was already a retry
        setError(`Không thể tải dữ liệu. Vui lòng thử lại.`);
        setRetryCount(0);
        setIsRetrying(false);
        console.error(`Failed to fetch posts:`, error);
      }
    } finally {
      if (!isRetrying) {
        setLoading(false);
      }
    }
  }, [loading, hasMore, isRetrying, retryCount]);

  // Manual retry function
  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    clearTimeout(retryTimeoutRef.current);
    fetchPosts(nextToken);
  };

  // load batch đầu - with initialization check
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      fetchPosts();
    }
  }, [initialized, fetchPosts]);

  // scroll ẩn header
  useEffect(() => {
    const div = scrollRef.current;
    const handleScroll = () => {
      setIsScrolled(div?.scrollTop > 1);
    };
    if (div) div.addEventListener("scroll", handleScroll);
    return () => div?.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        // Only trigger if: intersecting, has more data, not loading, initialized, no error, not retrying
        if (first.isIntersecting && hasMore && !loading && initialized && !error && !isRetrying) {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fetchPosts(nextToken);
          }, 200);
        }
      },
      {
        root: scrollRef.current,
        rootMargin: "0px",
        threshold: 1.0,
      }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);

    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(retryTimeoutRef.current);
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [nextToken, hasMore, loading, initialized, error, isRetrying, fetchPosts]);

  // lock scroll khi mở profile
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", isProfileOpen);
    return () => document.body.classList.remove("overflow-hidden");
  }, [isProfileOpen]);

  return (
    <div
      className={`fixed inset-0 flex flex-col transition-transform duration-500 z-50 bg-base-100 ${
        isProfileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <AddPostButton />

      {/* Header */}
      <div className="flex flex-col shadow-lg px-4 py-2 text-base-content relative overflow-hidden">
        <div className="flex items-center justify-between">
          <BadgePlan />
          <div className="flex items-center gap-3">
            <button>
              <Settings size={30} />
            </button>
            <button
              onClick={() => setIsProfileOpen(false)}
              className="rounded-lg hover:bg-base-200 transition cursor-pointer"
            >
              <ChevronRight size={40} />
            </button>
          </div>
        </div>

        <div
          className={`relative transition-all z-30 duration-500 ease-in-out ${
            isScrolled ? "h-0 opacity-0" : "h-19 mt-2"
          }`}
        >
          <div className="flex flex-row justify-between items-center text-base-content w-full">
            <div className="flex flex-col text-center items-start space-y-1">
              <p className="text-2xl font-semibold">
                {user?.displayName || "Name"}
              </p>
              <a
                href={`https://locket.cam/${user?.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link underline font-semibold flex items-center justify-between"
              >
                @{user?.username} <Link className="ml-2" size={18} />
              </a>
            </div>
            <div className="avatar w-18 h-18 disable-select">
              <div className="rounded-full shadow-md outline-4 outline-amber-400 p-1 flex justify-items-center">
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingRing size={40} stroke={2} color="blue" />
                  </div>
                )}
                <img
                  src={user?.profilePicture || "/prvlocket.png"}
                  alt="Profile"
                  className={`w-19 h-19 transition-opacity duration-300 rounded-full ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      >
        {posts.map((post, index) => (
          <PostCard key={post?.id || index} post={post} />
        ))}

        {/* Loading indicator */}
        {(loading || isRetrying) && (
          <div className="flex flex-col items-center py-4">
            <LoadingRing size={40} stroke={2} color="blue" />
            {isRetrying && (
              <p className="text-sm text-gray-500 mt-2">
                Đang thử lại... ({retryCount}/{MAX_RETRY_ATTEMPTS})
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center py-4 space-y-3">
            <div className="text-center text-red-500 text-sm">{error}</div>
            <button
              onClick={handleRetry}
              className="btn btn-sm btn-outline btn-primary"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && !error && <div ref={loaderRef} className="h-8" />}

        {/* End of content */}
        {!hasMore && !error && (
          <div className="flex flex-col items-center">
            <img src="boom.jfif" className="w-52 h-52" />
            <div className="text-center text-gray-500 py-4">Hết dữ liệu 😎</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftHomeScreen;
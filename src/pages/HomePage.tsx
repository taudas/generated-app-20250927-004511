import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
const STREAM_URL = "https://floyd.wcbn.org:8443/wcbn-hd.mp3";
export function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [status, setStatus] = useState('Paused');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVolumeRef = useRef(volume);
  useEffect(() => {
    const audio = new Audio(STREAM_URL);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    const handlePlay = () => {
      setIsPlaying(true);
      setStatus('Live');
    };
    const handlePause = () => {
      setIsPlaying(false);
      setStatus('Paused');
    };
    const handleWaiting = () => setStatus('Buffering...');
    const handleCanPlay = () => {
      if (audio.paused) {
        setStatus('Paused');
      } else {
        setStatus('Live');
      }
    };
    const handleError = () => setStatus('Error');
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handlePause);
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, []);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (volume > 0) {
      lastVolumeRef.current = volume;
    }
  }, [volume]);
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error("Playback failed:", error);
          setStatus('Error');
        });
      }
    }
  };
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };
  const toggleMute = () => {
    if (volume === 0) {
      setVolume(lastVolumeRef.current > 0 ? lastVolumeRef.current : 0.5);
    } else {
      setVolume(0);
    }
  };
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 relative">
      <ThemeToggle className="absolute top-6 right-6" />
      <Card className="w-full max-w-md shadow-lg border animate-fade-in">
        <CardHeader className="text-center p-8">
          <h1 className="font-display text-4xl font-bold">AuraStream</h1>
          <p className="text-muted-foreground">WCBN-FM Ann Arbor</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-8 p-8 pt-0">
          <div className="flex flex-col items-center space-y-2">
            <p className="text-lg font-medium text-primary">{status}</p>
            <p className="text-sm text-muted-foreground">Live Radio Stream</p>
          </div>
          <Button
            onClick={togglePlayPause}
            size="lg"
            className={cn(
              "rounded-full h-20 w-20 transition-all duration-300 ease-in-out focus-visible:ring-offset-4 focus-visible:ring-offset-background",
              isPlaying && "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary animate-glow"
            )}
            aria-label={isPlaying ? "Pause Stream" : "Play Stream"}
          >
            {isPlaying ? (
              <Pause className="h-10 w-10" />
            ) : (
              <Play className="h-10 w-10 ml-1" />
            )}
          </Button>
          <div className="w-full flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="rounded-full"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.01}
              aria-label="Volume control"
            />
          </div>
        </CardContent>
      </Card>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground/80">
        <p>Built with ❤️ at Cloudflare</p>
      </footer>
    </main>
  );
}
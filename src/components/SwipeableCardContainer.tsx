import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

interface SwipeableCardContainerProps {
  children: React.ReactNode[];
  title?: string;
  showControls?: boolean;
  showIndicators?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onCardChange?: (index: number) => void;
}

const SwipeableCardContainer: React.FC<SwipeableCardContainerProps> = ({
  children,
  title,
  showControls = true,
  showIndicators = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  onCardChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  useEffect(() => {
    if (autoPlay && children.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === children.length - 1 ? 0 : prevIndex + 1
        );
      }, autoPlayInterval);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, children.length]);

  useEffect(() => {
    if (onCardChange) {
      onCardChange(currentIndex);
    }
  }, [currentIndex, onCardChange]);

  const goToNext = () => {
    if (currentIndex < children.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    
    // Pause autoplay on touch
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < children.length - 1) {
      goToNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      goToPrevious();
    }

    // Resume autoplay after touch
    if (autoPlay && children.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === children.length - 1 ? 0 : prevIndex + 1
        );
      }, autoPlayInterval);
    }
  };

  if (children.length === 0) {
    return null;
  }

  return (
    <Card elevation={2} sx={{ mb: 2, overflow: 'hidden' }}>
      {title && (
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {children.length > 1 && (
              <Typography variant="caption" color="text.secondary">
                {currentIndex + 1} of {children.length}
              </Typography>
            )}
          </Box>
        </CardContent>
      )}

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          touchAction: 'pan-y',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Box
          sx={{
            display: 'flex',
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: 'transform 0.3s ease-in-out',
            width: `${children.length * 100}%`,
          }}
        >
          {children.map((child, index) => (
            <Box
              key={index}
              sx={{
                width: `${100 / children.length}%`,
                flexShrink: 0,
              }}
            >
              {child}
            </Box>
          ))}
        </Box>

        {/* Navigation Controls */}
        {showControls && children.length > 1 && isMobile && (
          <>
            <IconButton
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              sx={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(4px)',
                minWidth: 44,
                minHeight: 44,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>

            <IconButton
              onClick={goToNext}
              disabled={currentIndex === children.length - 1}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(4px)',
                minWidth: 44,
                minHeight: 44,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
      </Box>

      {/* Indicators */}
      {showIndicators && children.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1,
            p: 2,
            pt: 1,
          }}
        >
          {children.map((_, index) => (
            <Box
              key={index}
              onClick={() => goToSlide(index)}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: index === currentIndex ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: index === currentIndex ? 'primary.dark' : 'grey.400',
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Desktop Navigation Controls */}
      {showControls && children.length > 1 && !isMobile && (
        <CardContent sx={{ pt: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <IconButton
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              size="small"
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <ChevronLeftIcon />
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {children.map((_, index) => (
                <IconButton
                  key={index}
                  onClick={() => goToSlide(index)}
                  size="small"
                  sx={{
                    width: 12,
                    height: 12,
                    minWidth: 12,
                    minHeight: 12,
                    backgroundColor: index === currentIndex ? 'primary.main' : 'grey.300',
                    '&:hover': {
                      backgroundColor: index === currentIndex ? 'primary.dark' : 'grey.400',
                    },
                  }}
                />
              ))}
            </Box>

            <IconButton
              onClick={goToNext}
              disabled={currentIndex === children.length - 1}
              size="small"
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </CardContent>
      )}
    </Card>
  );
};

export default SwipeableCardContainer;
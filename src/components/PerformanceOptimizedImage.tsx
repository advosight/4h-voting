import React from 'react';
import { ResponsiveImage } from './ResponsiveImage';
import usePerformanceOptimization from '../hooks/usePerformanceOptimization';

interface PerformanceOptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

export const PerformanceOptimizedImage: React.FC<PerformanceOptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  onLoad,
  onError
}) => {
  const { getOptimizedImageProps } = usePerformanceOptimization({
    enableImageOptimization: true
  });

  const optimizedProps = getOptimizedImageProps(src, alt);

  return (
    <ResponsiveImage
      {...optimizedProps}
      width={width}
      height={height}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

export default PerformanceOptimizedImage;
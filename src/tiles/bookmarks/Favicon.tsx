import { useState } from 'react';

interface FaviconProps {
  url: string;
  title: string;
  size?: 'md' | 'sm';
}

/** Site icon with a letter as fallback; the request goes only to the site itself */
export function Favicon({ url, title, size = 'md' }: FaviconProps) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const { origin, hostname } = new URL(url);
  const letter = (title || hostname).trim().charAt(0).toUpperCase();

  return (
    <span className={`fav fav--${size} is-${state}`} aria-hidden="true">
      {state !== 'ok' && <span className="fav__letter">{letter}</span>}
      {state !== 'failed' && (
        <img
          src={`${origin}/favicon.ico`}
          alt=""
          loading="lazy"
          draggable={false}
          referrerPolicy="no-referrer"
          onLoad={(event) => setState(event.currentTarget.naturalWidth > 1 ? 'ok' : 'failed')}
          onError={() => setState('failed')}
        />
      )}
    </span>
  );
}

import { Link, type LinkProps } from 'react-router-dom';
import { withTrailingSlash } from '../lib/seo';

function slashTo(to: LinkProps['to']): LinkProps['to'] {
  if (typeof to === 'string') return withTrailingSlash(to);
  if (typeof to === 'object' && to && 'pathname' in to && to.pathname) {
    return { ...to, pathname: withTrailingSlash(to.pathname) };
  }
  return to;
}

/** Public links use a trailing slash so GitHub Pages does not 301 /path → /path/. */
export default function AppLink({ to, ...rest }: LinkProps) {
  return <Link to={slashTo(to)} {...rest} />;
}

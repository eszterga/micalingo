import { Link, type LinkProps } from 'react-router-dom';
import { withoutTrailingSlash } from '../lib/seo';

function slashTo(to: LinkProps['to']): LinkProps['to'] {
  if (typeof to === 'string') return withoutTrailingSlash(to);
  if (typeof to === 'object' && to && 'pathname' in to && to.pathname) {
    return { ...to, pathname: withoutTrailingSlash(to.pathname) };
  }
  return to;
}

/** Public links stay slashless so they match the HTTP 200 GitHub Pages URL. */
export default function AppLink({ to, ...rest }: LinkProps) {
  return <Link to={slashTo(to)} {...rest} />;
}

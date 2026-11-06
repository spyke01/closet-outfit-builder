import { navigate } from "./runtime";
export default function Link({ href, prefetch, onClick, ...props }) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          !event.metaKey &&
          !event.ctrlKey &&
          String(href).startsWith("/")
        ) {
          event.preventDefault();
          navigate(href);
        }
      }}
    />
  );
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  // Only follow http(s) URLs — blocks dangerous schemes (e.g. javascript:) from
  // landing in the anchor href on web or being opened on native.
  const isSafe = /^https?:\/\//i.test(props.href);

  return (
    <Link
      target="_blank"
      {...props}
      // @ts-expect-error: External URLs are not typed.
      href={isSafe ? props.href : '#'}
      onPress={(e) => {
        if (!isSafe) {
          e.preventDefault();
          return;
        }
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(props.href);
        }
      }}
    />
  );
}

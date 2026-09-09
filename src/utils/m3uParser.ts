import { IPTVChannel } from '../types';

export interface ParseResult {
  channels: IPTVChannel[];
  groups: string[];
  totalParsed: number;
}

/**
 * Parses an M3U / M3U8 string and converts it into structured IPTVChannel objects.
 */
export function parseM3U(content: string, startingNumber = 1): ParseResult {
  const lines = content.split(/\r?\n/);
  const channels: IPTVChannel[] = [];
  const groupsSet = new Set<string>();

  let currentExtinf: {
    name: string;
    group: string;
    logo: string;
    tvgId: string;
  } | null = null;

  let channelNumber = startingNumber;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check if line is #EXTINF
    if (rawLine.startsWith('#EXTINF:')) {
      // Extract tvg-name, tvg-logo, tvg-id, group-title
      const tvgNameMatch = rawLine.match(/tvg-name=["']([^"']+)["']/i);
      const tvgLogoMatch = rawLine.match(/tvg-logo=["']([^"']+)["']/i);
      const tvgIdMatch = rawLine.match(/tvg-id=["']([^"']+)["']/i);
      const groupTitleMatch = rawLine.match(/group-title=["']([^"']+)["']/i);

      // Extract title after the comma
      const commaIndex = rawLine.lastIndexOf(',');
      let rawTitle = '';
      if (commaIndex !== -1 && commaIndex < rawLine.length - 1) {
        rawTitle = rawLine.substring(commaIndex + 1).trim();
      }

      const name = (rawTitle || tvgNameMatch?.[1] || `Kanal ${channelNumber}`).trim();
      const group = (groupTitleMatch?.[1] || 'Genel').trim();
      const logo = (tvgLogoMatch?.[1] || '').trim();
      const tvgId = (tvgIdMatch?.[1] || '').trim();

      currentExtinf = {
        name,
        group,
        logo,
        tvgId,
      };
      continue;
    }

    // Check if line is #EXTGRP (some IPTV providers use this)
    if (rawLine.startsWith('#EXTGRP:') && currentExtinf) {
      const extGrp = rawLine.replace('#EXTGRP:', '').trim();
      if (extGrp) {
        currentExtinf.group = extGrp;
      }
      continue;
    }

    // Skip other comments
    if (rawLine.startsWith('#')) {
      continue;
    }

    // This line is a Stream URL (http/https/rtmp/etc.)
    if (rawLine.startsWith('http://') || rawLine.startsWith('https://') || rawLine.startsWith('rtmp://') || rawLine.startsWith('mms://') || rawLine.includes('://')) {
      const channelName = currentExtinf?.name || `Kanal ${channelNumber}`;
      const channelGroup = currentExtinf?.group || 'Genel';
      const channelLogo = currentExtinf?.logo || '';
      const tvgId = currentExtinf?.tvgId || '';

      groupsSet.add(channelGroup);

      channels.push({
        id: `m3u-${Date.now()}-${channelNumber}-${Math.random().toString(36).substring(2, 7)}`,
        number: channelNumber,
        name: channelName,
        category: channelGroup,
        group: channelGroup,
        streamUrl: rawLine,
        logo: channelLogo,
        tvgId,
        badge: 'CANLI',
        currentProgram: 'Canlı Yayın',
        description: `${channelGroup} grubunda yer alan canlı yayın.`,
        isFavorite: false,
      });

      channelNumber++;
      currentExtinf = null;
    }
  }

  const groups = Array.from(groupsSet).sort((a, b) => a.localeCompare(b, 'tr'));

  return {
    channels,
    groups,
    totalParsed: channels.length,
  };
}

/**
 * Export channels back to M3U format string if needed
 */
export function exportToM3U(channels: IPTVChannel[]): string {
  let output = '#EXTM3U\n';
  channels.forEach((ch) => {
    output += `#EXTINF:-1 tvg-name="${ch.name}" group-title="${ch.group || ch.category}"${
      ch.logo ? ` tvg-logo="${ch.logo}"` : ''
    },${ch.name}\n`;
    output += `${ch.streamUrl}\n`;
  });
  return output;
}

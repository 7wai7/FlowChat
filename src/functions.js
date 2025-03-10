import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

function timeAgo(date_) {
    const date = new Date(date_);
    return formatDistanceToNow(date, { addSuffix: true, locale: uk });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default {
    formatDistanceToNow,
    uk,
    timeAgo,
    formatTime
}
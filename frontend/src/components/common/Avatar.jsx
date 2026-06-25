const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' };

const Avatar = ({ src, name = '', size = 'md', className = '' }) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold ${sizes[size]} ${className}`}>
      {initials || '?'}
    </div>
  );
};

export default Avatar;

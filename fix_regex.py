import sys

file_path = '/home/rdelgado/Development/pharos-kitchen-design/issue-215/apps/marketing/src/components/CommandBar.astro'

with open(file_path, 'r') as f:
    lines = f.readlines()

# Correct indices for lines 108 to 121 (1-based) are 107 to 121 (0-based, exclusive end)
# Line 121 is the extra '}' we want to remove.

new_function = r"""  function matchWildcard(text, pattern) {
    // RFC-2378 Wildcard Support: *, +, ?, []
    // Implementation: Convert RFC-2378 wildcards to Regex after escaping metacharacters
    const regexPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\+/g, '.+')
      .replace(/\\\?/g, '.')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(text);
  }
"""

with open(file_path, 'w') as f:
    f.writelines(lines[:107])
    f.write(new_function)
    f.writelines(lines[121:])

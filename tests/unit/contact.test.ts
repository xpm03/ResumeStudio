import { describe, expect, it } from 'vitest';
import { contactFieldWarning, createBlank, parseBackup, safeEmailLink, safeWebLink } from '../../src/domain/resume/model';

describe('contact field feedback', () => {
  it.each(['', ' ', '\t\n'])('treats blank optional contacts as empty: %j', value => {
    expect(contactFieldWarning('email', value)).toBeUndefined();
    expect(contactFieldWarning('website', value)).toBeUndefined();
  });

  it.each(['student@example.test', 'first.last+jobs@careers.example.test', 'CV@Example.TEST'])(
    'accepts a common email address: %s', value => {
      expect(contactFieldWarning('email', value)).toBeUndefined();
      expect(safeEmailLink(value)).toBe(`mailto:${encodeURIComponent(value.split('@')[0])}@${value.split('@')[1]}`);
    },
  );

  it.each(['student', 'student@', '@example.test', 'a@@example.test', 'a b@example.test',
    'a@example', 'a@example..test', 'a@-example.test', '.a@example.test', 'a..b@example.test',
    'mailto:a@example.test', 'student@example.test?subject=hello', 'a@example.test#fragment',
    'a@example.test\r\nBcc:other@example.test', 'a@example.test ', '"quoted"@example.test'])(
    'warns without generating an email link: %j', value => {
      expect(contactFieldWarning('email', value)).toContain('可以继续编辑');
      expect(safeEmailLink(value)).toBeUndefined();
    },
  );

  it('encodes reserved local-part characters once instead of adding URI fields', () => {
    expect(safeEmailLink('jobs?tag&name=one#cv%20@example.test')).toBe(
      'mailto:jobs%3Ftag%26name%3Done%23cv%2520@example.test',
    );
    const uri = new URL(safeEmailLink('jobs?tag&name=one#cv%20@example.test')!);
    expect(uri.search).toBe('');
    expect(uri.hash).toBe('');
  });

  it.each(['example.test', 'https://example.test/work', 'http://portfolio.example.test', 'https://例子.测试/作品'])(
    'retains existing valid website support: %s', value => {
      expect(contactFieldWarning('website', value)).toBeUndefined();
      expect(safeWebLink(value)).toBeTruthy();
    },
  );

  it.each(['https://', 'not a website', 'javascript:alert(1)', 'data:text/html,test',
    'file:///private/resume', 'https://user:password@example.test', 'https://user@example.test'])(
    'warns and keeps unsafe/incomplete websites non-clickable: %s', value => {
      expect(contactFieldWarning('website', value)).toContain('可以继续编辑');
      expect(safeWebLink(value)).toBeUndefined();
    },
  );

  it('keeps unfinished contact data intact across backup validation', () => {
    const resume = createBlank();
    resume.basics.email = 'student@';
    resume.basics.website = 'https://';
    expect(parseBackup(JSON.stringify(resume)).basics).toEqual(resume.basics);
  });
});

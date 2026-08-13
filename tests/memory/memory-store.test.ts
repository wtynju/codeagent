// 记忆存储测试

import { MemoryStore } from '../../src/memory/memory-store';
import * as path from 'path';
import * as fs from 'fs';

const TEST_DB = path.join(__dirname, '../test-memory.db');

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore(TEST_DB);
  });

  afterEach(() => {
    store.close();
    try { fs.unlinkSync(TEST_DB); } catch {}
  });

  it('保存并检索记忆', () => {
    store.save({
      type: 'convention',
      content: '使用 2 空格缩进',
      tags: 'style,indent',
    });
    const results = store.search('缩进');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('缩进');
  });

  it('按类型检索', () => {
    store.save({ type: 'decision', content: '使用 React 框架', tags: 'framework' });
    store.save({ type: 'preference', content: '不要使用 any 类型', tags: 'typescript' });

    const decisions = store.getByType('decision');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].content).toContain('React');
  });

  it('无关关键词不命中', () => {
    store.save({ type: 'convention', content: '使用 2 空格缩进', tags: 'style' });
    const results = store.search('数据库');
    expect(results).toHaveLength(0);
  });

  it('删除记忆', () => {
    const id = store.save({ type: 'preference', content: 'test', tags: 'test' });
    store.delete(id);
    const all = store.getAll();
    expect(all.find(m => m.id === id)).toBeUndefined();
  });
});
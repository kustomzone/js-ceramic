import ThreeIdHandler from '../threeIdHandler'
import CID from 'cids'

jest.mock('../../user')
import User from '../../user'
jest.mock('did-jwt', () => ({
  // TODO - We should test for when this function throws as well
  verifyJWT: (): any => 'verified'
}))

const FAKE_CID = new CID('bafybeig6xv5nwphfmvcnektpnojts33jqcuam7bmye2pb54adnrtccjlsu')
const RECORDS = {
  genesis: { doctype: '3id', owners: [ '0x123' ], content: { publicKeys: { test: '0xabc' } } },
  r1: {
    desiredContent: { publicKeys: { test: '0xabc' }, other: 'data' },
    record: { content: [ { op: 'add', path: '/other', value: 'data' } ], prev: FAKE_CID, header: 'aaaa', signature: 'cccc' }
  },
  r2: { record: {}, proof: { blockNumber: 123456 } }
}

describe('ThreeIdHandler', () => {
  let user, handler

  beforeAll(() => {
    user = new User()
    user.sign = jest.fn(async () => {
      // fake jwt
      return 'aaaa.bbbb.cccc'
    })
  })

  beforeEach(() => {
    handler = new ThreeIdHandler()
  })

  it('is constructed correctly', async () => {
    expect(handler.doctype).toEqual('3id')
  })

  it('user is set correctly', async () => {
    handler.user = user
    expect(handler.user).toEqual(user)
  })

  it('makes genesis record correctly', async () => {
    await expect(handler.makeGenesis(RECORDS.genesis.content)).rejects.toThrow(/The owner/)
    const record = await handler.makeGenesis(RECORDS.genesis.content, RECORDS.genesis.owners)
    expect(record).toEqual(RECORDS.genesis)
  })

  it('applies genesis record correctly', async () => {
    const state = await handler.applyGenesis(RECORDS.genesis, FAKE_CID)
    expect(state).toMatchSnapshot()
  })

  it('makes signed record correctly', async () => {
    const state = await handler.applyGenesis(RECORDS.genesis, FAKE_CID)
    await expect(handler.makeRecord(state, RECORDS.r1.desiredContent)).rejects.toThrow(/No user/)
    handler.user = user
    const record = await handler.makeRecord(state, RECORDS.r1.desiredContent)
    expect(record).toEqual(RECORDS.r1.record)
  })

  it('applies signed record correctly', async () => {
    let state = await handler.applyGenesis(RECORDS.genesis, FAKE_CID)
    state = await handler.applySigned(RECORDS.r1.record, 'cid2', state)
    expect(state).toMatchSnapshot()
  })

  it('applies anchor record correctly', async () => {
    let state = await handler.applyGenesis(RECORDS.genesis, FAKE_CID)
    state = await handler.applySigned(RECORDS.r1.record, 'cid2', state)
    state = await handler.applyAnchor(RECORDS.r2.record, RECORDS.r2.proof, 'cid3', state)
    expect(state).toMatchSnapshot()
  })
})

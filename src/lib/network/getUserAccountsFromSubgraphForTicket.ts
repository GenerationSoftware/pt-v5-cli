import makeGraphQlQuery from '../utils/makeGraphQlQuery'
import getSubgraphUrlForNetwork from '../utils/getSubgraphUrlForNetwork'

export async function getUserAccountsFromSubgraphForTicket(
  chainId: string,
  ticket: string,
  drawStartTime: number,
  drawEndTime: number,
): Promise<any[]> {
  const subgraphURL = getSubgraphUrlForNetwork(chainId)
  const _ticket = ticket.toLowerCase()
  const allUserBalances = await makeGraphQlQuery(
    subgraphURL,
    _ticket,
    drawStartTime,
    drawEndTime,
  )

  return allUserBalances.flat(1)
}


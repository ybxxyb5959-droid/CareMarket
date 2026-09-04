export const EMPTY_CART = { ownerId: null, rows: [], loading: false, pending: 0, error: null }

// Each account has a separate request generation and write queue. Old responses
// cannot publish into a new account, even after A -> logout -> A.
export function createCartController(client, publish, reportError) {
  let state = { ...EMPTY_CART }
  let generation = 0
  let readVersion = 0
  let queue = Promise.resolve()
  const emit = (patch) => { state = { ...state, ...patch }; publish(state) }
  const current = (owner, version) => owner === state.ownerId && version === generation
  const fail = (error) => {
    console.error('Supabase cart operation failed:', error)
    emit({ error: '장바구니를 동기화하지 못했습니다. 다시 시도해 주세요.' })
    reportError('장바구니를 동기화하지 못했습니다. 다시 시도해 주세요.')
  }

  const setOwner = (ownerId) => {
    if (state.ownerId === ownerId) return
    generation += 1
    readVersion += 1
    queue = Promise.resolve()
    state = { ...EMPTY_CART, ownerId, loading: Boolean(ownerId) }
    publish(state)
  }

  const load = async () => {
    const owner = state.ownerId
    if (!owner) return false
    const version = generation
    const request = ++readVersion
    emit({ loading: true })
    try {
      const { data, error } = await client.from('cart_items')
        .select('cart_item_id, product_id, quantity, product:products(*)')
        .eq('user_id', owner).order('created_at', { ascending: true })
      if (!current(owner, version) || request !== readVersion) return false
      if (error) throw error
      emit({ rows: data || [], error: null })
      return true
    } catch (error) {
      if (current(owner, version) && request === readVersion) fail(error)
      return false
    } finally {
      if (current(owner, version) && request === readVersion) emit({ loading: false })
    }
  }

  const mutate = (operation) => {
    const owner = state.ownerId
    const version = generation
    if (!owner) return Promise.resolve(false)
    emit({ pending: state.pending + 1 })
    const task = queue.then(async () => {
      if (!current(owner, version)) return false
      ++readVersion
      try {
        const { error } = await operation(owner)
        if (!current(owner, version)) return false
        if (error) throw error
        // No optimistic success: reconcile from the server after every write.
        const loaded = await load()
        return current(owner, version) && loaded
      } catch (error) {
        if (current(owner, version)) fail(error)
        return false
      } finally {
        if (current(owner, version)) emit({ pending: state.pending - 1, loading: false })
      }
    })
    queue = task.catch(() => false)
    return task
  }

  return {
    setOwner, load,
    getOwner: () => state.ownerId,
    getGeneration: () => generation,
    add: (productId, quantity = 1) => mutate(owner => client.rpc('add_my_cart_item', {
      p_product_id: productId, p_quantity: quantity, p_user_id: owner,
    })),
    changeQuantity: (productId, delta) => mutate(owner => client.rpc('change_my_cart_quantity', {
      p_product_id: productId, p_delta: delta, p_user_id: owner,
    })),
    remove: (productId) => mutate(owner => client.from('cart_items').delete()
      .eq('user_id', owner).eq('product_id', productId)),
  }
}

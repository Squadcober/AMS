export const updateUserData = (userId: string, updatedData: any) => {
  try {
    // Update player data
    const playerData = JSON.parse(localStorage.getItem("ams-player-data") || "[]")
    const updatedPlayerData = playerData.map((player: any) => {
      if (player.userId === userId) {
        return {
          ...player,
          ...updatedData,
          // Preserve existing attributes
          attributes: {
            ...(player.attributes || {}),
            ...(updatedData.attributes || {})
          }
        }
      }
      return player
    })
    localStorage.setItem("ams-player-data", JSON.stringify(updatedPlayerData))

    // Update users data
    const userData = JSON.parse(localStorage.getItem("ams-users") || "[]")
    const updatedUserData = userData.map((user: any) => {
      if (user.username === userId) {
        return {
          ...user,
          ...updatedData
        }
      }
      return user
    })
    localStorage.setItem("ams-users", JSON.stringify(updatedUserData))

    // Update current user if it exists
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
    if (currentUser.username === userId) {
      const updatedCurrentUser = {
        ...currentUser,
        ...updatedData
      }
      localStorage.setItem("currentUser", JSON.stringify(updatedCurrentUser))
    }

    return true
  } catch (error) {
    console.error("Error updating user data:", error)
    return false
  }
}

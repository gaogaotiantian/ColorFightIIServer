def clip(num, min_limit, max_limit):
    if num < min_limit:
        return min_limit
    elif num > max_limit:
        return max_limit
    return num
